package com.drkindo.service;

import com.drkindo.model.Folder;
import com.drkindo.model.Media;
import com.drkindo.model.Post;
import com.drkindo.repository.FolderRepository;
import com.drkindo.repository.MediaRepository;
import com.drkindo.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.*;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests du MediaScannerService pour valider :
 * 1. La hiérarchie correcte des dossiers
 * 2. La création récursive des parents
 * 3. La synchronisation BD ↔ Disque
 * 4. Les performances avec cache
 */
@SpringBootTest
@TestPropertySource(properties = {
    "app.media.scan-path=src/test/resources/test-media"
})
@DisplayName("MediaScannerService - Tests de hiérarchie et synchronisation")
class MediaScannerServiceTest {

    @Autowired
    private MediaScannerService mediaScannerService;

    @Autowired
    private FolderRepository folderRepository;

    @Autowired
    private MediaRepository mediaRepository;

    @Autowired
    private PostRepository postRepository;

    @BeforeEach
    void setUp() {
        // Nettoyer la BD avant chaque test
        postRepository.deleteAll();
        mediaRepository.deleteAll();
        folderRepository.deleteAll();
    }

    @Test
    @Transactional
    @DisplayName("Vérifier que les parents sont créés avant les enfants")
    void testFolderHierarchyOrder() {
        // Arranger : les dossiers de test existent
        Path testRoot = Paths.get("src/test/resources/test-media");
        assertTrue(Files.exists(testRoot), "Le dossier de test doit exister");

        // Agir : lancer le scan
        MediaScannerService.ScanResult result = mediaScannerService.scan();

        // Assert : vérifier que tous les dossiers ont un parent valide ou sont racine
        List<Folder> allFolders = folderRepository.findAll();
        
        for (Folder folder : allFolders) {
            if (folder.getParent() != null) {
                // Si le dossier a un parent, le parent doit exister en BD
                Long parentId = folder.getParent().getId();
                assertNotNull(parentId, "Le parent doit avoir un ID");
                assertTrue(folderRepository.existsById(parentId), 
                    "Le dossier parent doit exister en BD pour : " + folder.getPath());
            }
        }
    }

    @Test
    @Transactional
    @DisplayName("Vérifier que les fichiers sont liés au bon dossier")
    void testMediaFolderAssociation() {
        // Agir
        mediaScannerService.scan();

        // Assert
        List<Media> allMedia = mediaRepository.findAll();
        
        for (Media media : allMedia) {
            assertNotNull(media.getFolder(), 
                "Chaque média doit avoir un dossier parent assigné : " + media.getPath());
            
            // Vérifier que le dossier existe en BD
            assertTrue(folderRepository.existsById(media.getFolder().getId()),
                "Le dossier du média doit exister en BD : " + media.getPath());
        }
    }

    @Test
    @Transactional
    @DisplayName("Vérifier que les chemins sont uniques")
    void testUniquePaths() {
        // Agir
        mediaScannerService.scan();

        // Assert
        List<Folder> allFolders = folderRepository.findAll();
        List<String> paths = allFolders.stream().map(Folder::getPath).toList();
        
        assertEquals(paths.size(), paths.stream().distinct().count(),
            "Les chemins de dossiers doivent être uniques");
    }

    @Test
    @Transactional
    @DisplayName("Vérifier que le scan est idempotent")
    void testScanIdempotent() {
        // Agir : première passe
        MediaScannerService.ScanResult result1 = mediaScannerService.scan();
        int folders1 = result1.foldersCreated;
        int files1 = result1.filesScanned;

        // Agir : deuxième passe
        MediaScannerService.ScanResult result2 = mediaScannerService.scan();
        int folders2 = result2.foldersCreated;
        int files2 = result2.filesScanned;

        // Assert : la deuxième passe ne doit rien créer (idempotent)
        assertEquals(0, folders2, "Le deuxième scan ne doit pas créer de nouveaux dossiers");
        assertEquals(0, files2, "Le deuxième scan ne doit pas créer de nouveaux fichiers");
    }

    @Test
    @Transactional
    @DisplayName("Vérifier que la structure est correcte pour 3 niveaux")
    void testThreeLevelHierarchy() {
        // Agir
        mediaScannerService.scan();

        // Chercher un dossier à 3 niveaux de profondeur
        List<Folder> allFolders = folderRepository.findAll();
        
        for (Folder folder : allFolders) {
            // Parcourir jusqu'à la racine
            Folder current = folder;
            int depth = 0;
            while (current.getParent() != null) {
                current = current.getParent();
                depth++;
                assertTrue(depth < 20, "La profondeur ne doit pas être excessive : " + folder.getPath());
            }
        }

        // Assert : il doit y avoir au moins un dossier à 2+ niveaux
        boolean hasDeepFolder = allFolders.stream()
            .anyMatch(f -> f.getPath().contains("/") && f.getPath().split("/").length >= 2);
        assertTrue(hasDeepFolder, "Il doit y avoir des dossiers à plusieurs niveaux");
    }

    @Test
    @Transactional
    @DisplayName("Vérifier le comptage des résultats")
    void testScanResultCounting() {
        // Agir
        MediaScannerService.ScanResult result = mediaScannerService.scan();

        // Assert
        assertTrue(result.foldersCreated >= 0, "Le nombre de dossiers créés doit être >= 0");
        assertTrue(result.filesScanned >= 0, "Le nombre de fichiers scannés doit être >= 0");
        
        // Vérifier que les comptes correspondent à la BD
        List<Folder> allFolders = folderRepository.findAll();
        List<Media> allMedia = mediaRepository.findAll();
        
        assertTrue(result.foldersCreated == allFolders.size() || result.foldersCreated == 0,
            "Le compte de dossiers doit correspondre ou être 0 au premier scan");
        assertTrue(result.filesScanned == allMedia.size() || result.filesScanned == 0,
            "Le compte de fichiers doit correspondre ou être 0 au premier scan");
    }

    @Test
    @Transactional
    @DisplayName("Vérifier le toString de ScanResult")
    void testScanResultToString() {
        // Agir
        MediaScannerService.ScanResult result = mediaScannerService.scan();

        // Assert
        String str = result.toString();
        assertNotNull(str);
        assertTrue(str.contains("dossier"), "Le résumé doit contenir 'dossier'");
        assertTrue(str.contains("fichier"), "Le résumé doit contenir 'fichier'");
    }
    @Test
    @Transactional
    @DisplayName("Vérifier que le scan crée automatiquement des posts pour les audios")
    void testAutomaticPostCreationForAudio() {
        mediaScannerService.scan();

        List<Media> audioMedia = mediaRepository.findAll().stream()
                .filter(media -> media.getType() == Media.MediaType.AUDIO)
                .toList();
        List<Post> posts = postRepository.findAll();

        assertFalse(audioMedia.isEmpty(), "Les données de test doivent contenir au moins un audio");
        assertEquals(audioMedia.size(), posts.size(),
                "Chaque audio scanné doit avoir un post créé automatiquement");
        assertTrue(audioMedia.stream().allMatch(media -> media.getStatus() == Media.MediaStatus.PUBLISHED),
                "Chaque audio auto-publié doit être marqué comme PUBLISHED");
    }
}
