package com.drkindo.repository;

import com.drkindo.model.Folder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    Optional<Folder> findByPath(String path);

    List<Folder> findByParentIsNullOrderByNameAsc();

    List<Folder> findByParentNotNullOrderByNameAsc();

    List<Folder> findByParentIdOrderByNameAsc(Long parentId);

    boolean existsByPath(String path);
}
