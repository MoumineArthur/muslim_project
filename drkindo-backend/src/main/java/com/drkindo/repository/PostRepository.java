package com.drkindo.repository;

import com.drkindo.model.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PostRepository extends JpaRepository<Post, Long> {
    Page<Post> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Post> findByAuthorId(Long authorId, Pageable pageable);
    Page<Post> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);
    boolean existsByMediaId(Long mediaId);
    Optional<Post> findByMediaId(Long mediaId);
    void deleteByMediaId(Long mediaId);
    
    @org.springframework.data.jpa.repository.Query("SELECT p FROM Post p WHERE LOWER(p.title) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.transcription) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(p.media.filename) LIKE LOWER(CONCAT('%', :q, '%'))")
    Page<Post> search(@org.springframework.data.repository.query.Param("q") String q, Pageable pageable);
}
