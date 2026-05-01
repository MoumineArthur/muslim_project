package com.drkindo.service;

import com.drkindo.repository.FolderRepository;
import com.drkindo.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResetScanService {

    private final MediaRepository mediaRepository;
    private final FolderRepository folderRepository;
    private final MediaScannerService scannerService;

    /**
     * 1) Supprime tous les médias
     * 2) Supprime tous les dossiers (contrainte FK respectée grâce à l'ordre)
     * 3) Relance un scan complet
     */
    @Transactional
    public MediaScannerService.ScanResult resetAndScan() {
        long mediaCount = mediaRepository.count();
        long folderCount = folderRepository.count();

        log.info("=== RESET + SCAN ===");
        log.info("Suppression de {} média(s) et {} dossier(s)...", mediaCount, folderCount);

        // Supprimer dans le bon ordre (médias d'abord → FK vers folders)
        mediaRepository.deleteAll();
        mediaRepository.flush();

        folderRepository.deleteAll();
        folderRepository.flush();

        log.info("Base de données vidée. Lancement du scan...");

        // Relancer le scan
        MediaScannerService.ScanResult result = scannerService.scan();

        log.info("Reset + Scan terminé : {} dossier(s), {} fichier(s)", result.foldersCreated, result.filesScanned);
        return result;
    }
}
