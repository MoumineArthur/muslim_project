package com.drkindo.service;

import com.drkindo.model.*;
import com.drkindo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MediaService {
    private final MediaRepository mediaRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final MediaAnalyzerService mediaAnalyzerService;

    @Value("${app.media.scan-path}")
    private String uploadBasePath;

    public Page<Media> getAll(int page, int size) {
        return mediaRepository.findAll(PageRequest.of(page, size,
                Sort.by(
                        Sort.Order.desc("contentDate"),
                        Sort.Order.asc("sequenceNumber"),
                        Sort.Order.asc("filename"))));
    }

    public Media getById(Long id) {
        return mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Média introuvable"));
    }

    public List<Media> getByFolder(Long folderId) {
        return mediaRepository.findByFolderIdOrderByFilenameAsc(folderId).stream()
                .sorted(mediaSortComparator())
                .toList();
    }

    public Page<Media> search(String keyword, int page, int size) {
        return mediaRepository.findByFilenameContainingIgnoreCase(
                keyword,
                PageRequest.of(page, size,
                        Sort.by(
                                Sort.Order.desc("contentDate"),
                                Sort.Order.asc("sequenceNumber"),
                                Sort.Order.asc("filename"))));
    }

    @Transactional
    public Media upload(MultipartFile file, Long folderId, String username) throws IOException {
        Folder folder = folderId != null ? folderRepository.findById(folderId).orElse(null) : null;
        User user = userRepository.findByUsername(username).orElseThrow();

        String filename = file.getOriginalFilename();
        String ext = filename != null && filename.contains(".") ?
                filename.substring(filename.lastIndexOf('.') + 1).toLowerCase() : "mp3";
        
        String targetDir = folder != null ? folder.getPath() : "uploads";
        Path dir = Paths.get(uploadBasePath, targetDir);
        Files.createDirectories(dir);
        Path filePath = dir.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        String relativePath = targetDir + "/" + filename;
        Media.MediaType type = List.of("mp4","avi","mkv","webm","mov").contains(ext) ?
                Media.MediaType.VIDEO : Media.MediaType.AUDIO;

        Media media = Media.builder()
                .filename(filename)
                .path(relativePath)
                .size(file.getSize())
                .mimeType(file.getContentType())
                .type(type)
                .folder(folder)
                .uploadedBy(user)
                .build();
        mediaAnalyzerService.applyExtractedMetadata(media);
        return mediaRepository.save(media);
    }

    @Transactional
    public void incrementPlayCount(Long id) {
        mediaRepository.findById(id).ifPresent(m -> {
            m.setPlayCount(m.getPlayCount() + 1);
            mediaRepository.save(m);
        });
    }

    @Transactional
    public void delete(Long id) {
        mediaRepository.deleteById(id);
    }

    @Transactional
    public void changeStatus(Long id, Media.MediaStatus status) {
        Media media = getById(id);
        media.setStatus(status);
        mediaRepository.save(media);
    }

    public void analyze(Long id) {
        mediaAnalyzerService.analyzeMedia(id);
    }

    public Map<String, Object> getDuplicates() {
        List<Media> allMedia = mediaRepository.findAll();
        Map<String, List<Media>> groupedByHash = allMedia.stream()
                .filter(m -> m.getFileHash() != null)
                .collect(Collectors.groupingBy(Media::getFileHash));

        Map<String, List<Media>> duplicates = groupedByHash.entrySet().stream()
                .filter(e -> e.getValue().size() > 1)
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        
        return Map.of("duplicates", duplicates);
    }

    private Comparator<Media> mediaSortComparator() {
        return Comparator
                .comparing(Media::getContentDate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Media::getSequenceNumber, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Media::getFilename, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
    }
}
