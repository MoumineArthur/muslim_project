package com.drkindo.repository;

import com.drkindo.dto.PostSearchCriteria;
import com.drkindo.model.Post;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class PostSpecification {

    public static Specification<Post> withCriteria(PostSearchCriteria criteria) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (criteria.getQuery() != null && !criteria.getQuery().trim().isEmpty()) {
                String pattern = "%" + criteria.getQuery().trim().toLowerCase() + "%";
                Predicate titleLike = cb.like(cb.lower(root.get("title")), pattern);
                Predicate descLike = cb.like(cb.lower(root.get("description")), pattern);
                Predicate transcriptionLike = cb.like(cb.lower(root.get("transcription")), pattern);
                Predicate filenameLike = cb.like(cb.lower(root.get("media").get("filename")), pattern);
                predicates.add(cb.or(titleLike, descLike, transcriptionLike, filenameLike));
            }

            if (criteria.getYear() != null) {
                predicates.add(cb.equal(root.get("media").get("contentYear"), criteria.getYear()));
            }

            if (criteria.getAuthorId() != null) {
                predicates.add(cb.equal(root.get("author").get("id"), criteria.getAuthorId()));
            }

            if (criteria.getFolderId() != null) {
                predicates.add(cb.equal(root.get("media").get("folder").get("id"), criteria.getFolderId()));
            }

            if (criteria.getType() != null) {
                predicates.add(cb.equal(root.get("media").get("type"), criteria.getType()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
