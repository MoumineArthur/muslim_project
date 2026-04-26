package com.drkindo.controller;

import com.drkindo.model.*;
import com.drkindo.repository.FolderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {
    private final FolderRepository folderRepository;

    @GetMapping
    public ResponseEntity<List<Folder>> getRoots() {
        return ResponseEntity.ok(folderRepository.findByParentIsNullOrderByNameAsc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Folder> getById(@PathVariable Long id) {
        return ResponseEntity.ok(folderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dossier introuvable")));
    }

    @GetMapping("/{id}/children")
    public ResponseEntity<List<Folder>> getChildren(@PathVariable Long id) {
        return ResponseEntity.ok(folderRepository.findByParentIdOrderByNameAsc(id));
    }
}
