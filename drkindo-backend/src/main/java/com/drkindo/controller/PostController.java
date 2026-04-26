package com.drkindo.controller;

import com.drkindo.model.*;
import com.drkindo.service.PostService;
import lombok.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;

    @GetMapping
    public ResponseEntity<Page<Post>> getFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(postService.getFeed(page, size));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<Post>> getByUser(@PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(postService.getByUser(userId, page, size));
    }
    @GetMapping("/suggest/{mediaId}")
    public ResponseEntity<?> suggest(@PathVariable Long mediaId) {
        return ResponseEntity.ok(postService.suggest(mediaId));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<Post>> search(@RequestParam String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(postService.search(q, page, size));
    }

    @PostMapping
    public ResponseEntity<Post> create(@RequestBody CreatePostRequest req, Authentication auth) {
        return ResponseEntity.ok(postService.create(
                req.mediaId, auth.getName(), req.title, req.description, req.authorId, req.tags));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<?> like(@PathVariable Long id, Authentication auth) {
        boolean liked = postService.toggleLike(id, auth.getName());
        return ResponseEntity.ok(java.util.Map.of("liked", liked, "count", postService.getLikeCount(id)));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Comment> comment(@PathVariable Long id,
                                           @RequestBody CommentRequest req, Authentication auth) {
        return ResponseEntity.ok(postService.addComment(id, auth.getName(), req.content));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<Page<Comment>> getComments(@PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(postService.getComments(id, page, size));
    }

    @Data static class CreatePostRequest {
        Long mediaId;
        String title;
        String description;
        Long authorId;
        java.util.List<String> tags;
    }

    @Data static class CommentRequest {
        String content;
    }
}
