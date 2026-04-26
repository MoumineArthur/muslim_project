package com.drkindo.service;

import com.drkindo.model.Author;
import com.drkindo.repository.AuthorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthorService {
    private final AuthorRepository authorRepository;

    public List<Author> getAll() {
        return authorRepository.findAll();
    }

    public Author getById(Long id) {
        return authorRepository.findById(id).orElseThrow();
    }

    @Transactional
    public Author create(Author author) {
        return authorRepository.save(author);
    }

    @Transactional
    public Author update(Long id, Author updated) {
        Author author = getById(id);
        author.setName(updated.getName());
        author.setBio(updated.getBio());
        author.setPhotoUrl(updated.getPhotoUrl());
        return authorRepository.save(author);
    }
}
