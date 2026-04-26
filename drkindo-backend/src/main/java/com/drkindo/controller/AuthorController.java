package com.drkindo.controller;

import com.drkindo.model.Author;
import com.drkindo.service.AuthorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/authors")
@RequiredArgsConstructor
public class AuthorController {
    private final AuthorService authorService;

    @GetMapping
    public ResponseEntity<List<Author>> getAll() {
        return ResponseEntity.ok(authorService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Author> getById(@PathVariable Long id) {
        return ResponseEntity.ok(authorService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Author> create(@RequestBody Author author) {
        return ResponseEntity.ok(authorService.create(author));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Author> update(@PathVariable Long id, @RequestBody Author author) {
        return ResponseEntity.ok(authorService.update(id, author));
    }
}
