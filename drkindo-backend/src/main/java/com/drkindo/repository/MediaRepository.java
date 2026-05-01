package com.drkindo.repository;

import com.drkindo.model.Media;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface MediaRepository extends JpaRepository<Media, Long> {
    Optional<Media> findByPath(String path);
    boolean existsByPath(String path);
    Page<Media> findAll(Pageable pageable);
    List<Media> findByFolderIdOrderByFilenameAsc(Long folderId);
    Page<Media> findByType(Media.MediaType type, Pageable pageable);
    Page<Media> findByFilenameContainingIgnoreCase(String keyword, Pageable pageable);
}
