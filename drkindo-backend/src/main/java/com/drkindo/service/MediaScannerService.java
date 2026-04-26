package com.drkindo.service;

import com.drkindo.model.Folder;
import com.drkindo.model.Media;
import com.drkindo.repository.FolderRepository;
import com.drkindo.repository.MediaRepository;
import com.drkindo.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaScannerService {

    private final MediaRepository mediaRepository;
    private final FolderRepository folderRepository;
    private final PostRepository postRepository;
    private final PostService postService;
    private final MediaAnalyzerService mediaAnalyzerService;

    @Value("${app.media.scan-path}")
    private String scanPath;

    private static final Set<String> AUDIO_EXT = Set.of(".mp3", ".wav", ".ogg", ".aac", ".m4a", ".flac");
    private static final Set<String> VIDEO_EXT = Set.of(".mp4", ".avi", ".mkv", ".webm", ".mov");

    @EventListener(ApplicationReadyEvent.class)
    public void initScan() {
        log.info("============================================");
        log.info("Repertoire de travail actuel : {}", System.getProperty("user.dir"));
        log.info("Chemin configure (scan-path) : {}", scanPath);
        log.info("Chemin absolu resolu         : {}", Paths.get(scanPath).toAbsolutePath().normalize());
        log.info("============================================");
        try {
            ScanResult result = scan();
            log.info("Scan initial termine : {} dossier(s), {} fichier(s) indexe(s)",
                    result.foldersCreated, result.filesScanned);
        } catch (Exception e) {
            log.error("Erreur lors du scan initial : {}", e.getMessage(), e);
        }
    }

    @Transactional
    public ScanResult scan() {
        ScanResult result = new ScanResult();
        Path root = resolveScanPath();

        log.info("=== SCAN en cours ===");
        log.info("Dossier scanne  : {}", root);
        log.info("Existe          : {}", Files.exists(root));
        log.info("Est un dossier  : {}", Files.isDirectory(root));

        if (!Files.exists(root) || !Files.isDirectory(root)) {
            log.error("Echec : dossier introuvable a : {}", root);
            return result;
        }

        try {
            long totalDirs = Files.walk(root).filter(Files::isDirectory).filter(d -> !d.equals(root)).count();
            long totalFiles = Files.walk(root).filter(Files::isRegularFile)
                    .filter(f -> isMediaFile(f.getFileName().toString())).count();
            log.info("Trouve : {} sous-dossier(s), {} fichier(s) media", totalDirs, totalFiles);

            Map<String, Folder> folderCache = new HashMap<>();

            Files.walk(root)
                    .filter(Files::isDirectory)
                    .filter(dir -> !dir.equals(root))
                    .sorted((p1, p2) -> {
                        int depth1 = countDepth(toRelative(root, p1));
                        int depth2 = countDepth(toRelative(root, p2));
                        if (depth1 != depth2) {
                            return depth1 - depth2;
                        }
                        return p1.compareTo(p2);
                    })
                    .forEach(dir -> indexFolder(dir, root, result, folderCache));

            Files.walk(root)
                    .filter(Files::isRegularFile)
                    .filter(file -> isMediaFile(file.getFileName().toString()))
                    .forEach(file -> indexMedia(file, root, result, folderCache));

            cleanupDeletedMedia(root, result);
            cleanupDeletedFolders(root, result);
            result.postsCreated = postService.ensurePostsForExistingAudios();

            log.info("=== SCAN termine ===");
            log.info("Resume : {} dossier(s) crees, {} dossiers supprimes, {} fichiers indexes, {} fichiers supprimes, {} post(s) crees",
                    result.foldersCreated, result.foldersDeleted, result.filesScanned, result.filesDeleted, result.postsCreated);
        } catch (IOException e) {
            log.error("Erreur pendant le scan : {}", e.getMessage(), e);
        }

        return result;
    }

    @Transactional
    private void cleanupDeletedMedia(Path root, ScanResult result) {
        List<Media> allMedia = mediaRepository.findAll();

        for (Media media : allMedia) {
            Path filePath = root.resolve(media.getPath());
            if (!Files.exists(filePath)) {
                postRepository.deleteByMediaId(media.getId());
                mediaRepository.delete(media);
                result.filesDeleted++;
            }
        }
    }

    @Transactional
    private void cleanupDeletedFolders(Path root, ScanResult result) {
        List<Folder> allFolders = folderRepository.findAll();

        allFolders.stream()
                .sorted((f1, f2) -> countDepth(f2.getPath()) - countDepth(f1.getPath()))
                .forEach(folder -> {
                    Path folderPath = root.resolve(folder.getPath());
                    if (!Files.exists(folderPath)) {
                        folderRepository.delete(folder);
                        result.foldersDeleted++;
                    }
                });
    }

    private Path resolveScanPath() {
        Path candidate = Paths.get(scanPath).toAbsolutePath().normalize();
        if (Files.exists(candidate)) {
            return candidate;
        }

        Path workDir = Paths.get(System.getProperty("user.dir"));
        String folderName = Paths.get(scanPath).getFileName().toString();
        Path current = workDir;
        for (int i = 0; i <= 3; i++) {
            Path attempt = current.resolve(folderName);
            if (Files.exists(attempt) && Files.isDirectory(attempt)) {
                return attempt;
            }
            if (current.getParent() == null) {
                break;
            }
            current = current.getParent();
        }

        return candidate;
    }

    private void indexFolder(Path dir, Path root, ScanResult result, Map<String, Folder> folderCache) {
        String relativePath = toRelative(root, dir);
        if (folderCache.containsKey(relativePath)) {
            return;
        }

        Optional<Folder> existing = folderRepository.findByPath(relativePath);
        if (existing.isPresent()) {
            folderCache.put(relativePath, existing.get());
            return;
        }

        Folder parent = null;
        Path parentDir = dir.getParent();
        if (parentDir != null && !parentDir.equals(root)) {
            String parentRelPath = toRelative(root, parentDir);
            parent = folderCache.get(parentRelPath);

            if (parent == null) {
                Optional<Folder> existingParent = folderRepository.findByPath(parentRelPath);
                if (existingParent.isPresent()) {
                    parent = existingParent.get();
                    folderCache.put(parentRelPath, parent);
                } else {
                    indexFolder(parentDir, root, result, folderCache);
                    parent = folderCache.get(parentRelPath);
                }
            }
        }

        Folder folder = Folder.builder()
                .name(dir.getFileName().toString())
                .path(relativePath)
                .parent(parent)
                .build();

        Folder savedFolder = folderRepository.save(folder);
        folderCache.put(relativePath, savedFolder);
        result.foldersCreated++;
    }

    private void indexMedia(Path file, Path root, ScanResult result, Map<String, Folder> folderCache) {
        String relativePath = toRelative(root, file);
        String ext = getExtension(file.getFileName().toString()).toLowerCase();
        Media.MediaType type = AUDIO_EXT.contains(ext) ? Media.MediaType.AUDIO : Media.MediaType.VIDEO;

        String parentRelPath = toRelative(root, file.getParent());
        Folder folder = folderCache.get(parentRelPath);
        if (folder == null) {
            folder = folderRepository.findByPath(parentRelPath).orElse(null);
            if (folder != null) {
                folderCache.put(parentRelPath, folder);
            }
        }

        long size = 0;
        try {
            size = Files.size(file);
        } catch (IOException ignored) {
        }

        Optional<Media> existingMedia = mediaRepository.findByPath(relativePath);
        Media media = existingMedia.orElseGet(() -> Media.builder()
                .filename(file.getFileName().toString())
                .path(relativePath)
                .build());

        media.setFilename(file.getFileName().toString());
        media.setSize(size);
        media.setType(type);
        media.setMimeType(type == Media.MediaType.AUDIO ? "audio/" + ext.substring(1) : "video/" + ext.substring(1));
        media.setFolder(folder);
        mediaAnalyzerService.applyExtractedMetadata(media);

        mediaRepository.save(media);
        if (existingMedia.isEmpty()) {
            result.filesScanned++;
        }
    }

    private int countDepth(String relativePath) {
        if (relativePath == null || relativePath.isEmpty()) {
            return 0;
        }
        return (int) relativePath.chars().filter(c -> c == '/').count() + 1;
    }

    private String toRelative(Path root, Path target) {
        return root.relativize(target).toString().replace("\\", "/");
    }

    private boolean isMediaFile(String filename) {
        String ext = getExtension(filename).toLowerCase();
        return AUDIO_EXT.contains(ext) || VIDEO_EXT.contains(ext);
    }

    private String getExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    public static class ScanResult {
        public int foldersCreated = 0;
        public int foldersDeleted = 0;
        public int filesScanned = 0;
        public int filesDeleted = 0;
        public int postsCreated = 0;
    }
}
