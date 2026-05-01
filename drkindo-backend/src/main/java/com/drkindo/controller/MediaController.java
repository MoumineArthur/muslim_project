package com.drkindo.controller;

import com.drkindo.model.Media;
import com.drkindo.service.MediaService;
import com.drkindo.service.MediaScannerService;
import com.drkindo.service.ResetScanService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;
import java.io.*;
import java.nio.file.*;
import java.util.List;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {
    private final MediaService mediaService;
    private final MediaScannerService scannerService;
    private final ResetScanService resetScanService;

    @Value("${app.media.scan-path}")
    private String mediaBasePath;

    @GetMapping
    public ResponseEntity<Page<Media>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(mediaService.getAll(page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Media> getById(@PathVariable Long id) {
        return ResponseEntity.ok(mediaService.getById(id));
    }

    @GetMapping("/folder/{folderId}")
    public ResponseEntity<List<Media>> getByFolder(@PathVariable Long folderId) {
        return ResponseEntity.ok(mediaService.getByFolder(folderId));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Media>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(mediaService.search(keyword, page, size));
    }

    @GetMapping("/stream/{id}")
    public ResponseEntity<byte[]> stream(@PathVariable Long id,
            @RequestHeader(value = "Range", required = false) String range) throws IOException {
        Media media = mediaService.getById(id);
        mediaService.incrementPlayCount(id);
        Path filePath = Paths.get(mediaBasePath).resolve(media.getPath());
        byte[] data = Files.readAllBytes(filePath);
        long fileSize = data.length;

        if (range == null) {
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            media.getMimeType() != null ? media.getMimeType() : "application/octet-stream"))
                    .contentLength(fileSize)
                    .body(data);
        }

        // HTTP Range request (streaming progressif)
        String[] ranges = range.replace("bytes=", "").split("-");
        long start = Long.parseLong(ranges[0]);
        long end = ranges.length > 1 && !ranges[1].isEmpty() ? Long.parseLong(ranges[1]) : fileSize - 1;
        end = Math.min(end, fileSize - 1);
        long contentLength = end - start + 1;

        byte[] chunk = new byte[(int) contentLength];
        System.arraycopy(data, (int) start, chunk, 0, (int) contentLength);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Range", "bytes " + start + "-" + end + "/" + fileSize);
        headers.add("Accept-Ranges", "bytes");
        headers.setContentLength(contentLength);
        headers.setContentType(
                MediaType.parseMediaType(media.getMimeType() != null ? media.getMimeType() : "audio/mpeg"));

        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).headers(headers).body(chunk);
    }

    @PostMapping("/upload")
    public ResponseEntity<Media> upload(@RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long folderId,
            Authentication auth) throws IOException {
        return ResponseEntity.ok(mediaService.upload(file, folderId, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        mediaService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> changeStatus(@PathVariable Long id, @RequestParam Media.MediaStatus status) {
        mediaService.changeStatus(id, status);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/analyze")
    public ResponseEntity<Void> analyze(@PathVariable Long id) {
        mediaService.analyze(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/duplicates")
    public ResponseEntity<?> getDuplicates() {
        return ResponseEntity.ok(mediaService.getDuplicates());
    }

    @PostMapping("/scan")
    public ResponseEntity<?> scan() {
        MediaScannerService.ScanResult result = scannerService.scan();
        return ResponseEntity.ok(result);
    }

    /**
     * Vide la base de données (médias + dossiers) puis relance un scan complet.
     * À utiliser pour réinitialiser proprement l'index.
     */
    @PostMapping("/reset-scan")
    public ResponseEntity<?> resetAndScan() {
        MediaScannerService.ScanResult result = resetScanService.resetAndScan();
        return ResponseEntity.ok(java.util.Map.of(
                "status", "ok",
                "foldersCreated", result.foldersCreated,
                "filesScanned", result.filesScanned
        ));
    }
}
