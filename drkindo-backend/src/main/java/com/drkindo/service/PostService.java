package com.drkindo.service;

import com.drkindo.model.*;
import com.drkindo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;
    private final MediaRepository mediaRepository;
    private final UserRepository userRepository;
    private final CommentRepository commentRepository;
    private final LikeRepository likeRepository;
    private final AuthorRepository authorRepository;
    private final MediaAnalyzerService mediaAnalyzerService;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    public Page<Post> getFeed(int page, int size) {
        return postRepository.findAll(PageRequest.of(page, size,
                Sort.by(
                        Sort.Order.desc("media.contentDate"),
                        Sort.Order.asc("media.sequenceNumber"),
                        Sort.Order.desc("createdAt"))));
    }

    public Page<Post> getByUser(Long userId, int page, int size) {
        return postRepository.findByAuthorId(userId, PageRequest.of(page, size,
                Sort.by(
                        Sort.Order.desc("media.contentDate"),
                        Sort.Order.asc("media.sequenceNumber"),
                        Sort.Order.desc("createdAt"))));
    }

    @Transactional
    public Post create(Long mediaId, String username, String title, String description, Long authorId, java.util.List<String> tags) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Média introuvable"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        Author author = authorRepository.findById(authorId)
                .orElseThrow(() -> new RuntimeException("Auteur introuvable"));
        Post post = Post.builder()
                .media(media).author(author).postedBy(user)
                .title(title).description(description)
                .tags(tags != null ? tags : new java.util.ArrayList<>())
                .build();
        return postRepository.save(post);
    }

    @Transactional
    public boolean toggleLike(Long postId, String username) {
        User user = userRepository.findByUsername(username).orElseThrow();
        if (likeRepository.existsByPostIdAndUserId(postId, user.getId())) {
            likeRepository.deleteByPostIdAndUserId(postId, user.getId());
            return false;
        } else {
            Post post = postRepository.findById(postId).orElseThrow();
            likeRepository.save(Like.builder().post(post).user(user).build());
            return true;
        }
    }

    @Transactional
    public Comment addComment(Long postId, String username, String content) {
        User user = userRepository.findByUsername(username).orElseThrow();
        Post post = postRepository.findById(postId).orElseThrow();
        Comment comment = Comment.builder()
                .post(post).author(user).content(content).build();
        return commentRepository.save(comment);
    }

    public Page<Comment> getComments(Long postId, int page, int size) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId, PageRequest.of(page, size));
    }

    public long getLikeCount(Long postId) {
        return likeRepository.countByPostId(postId);
    }

    public java.util.Map<String, Object> suggest(Long mediaId) {
        Media media = mediaRepository.findById(mediaId).orElseThrow();
        return mediaAnalyzerService.suggestMetadata(media);
    }

    public Page<Post> search(String q, int page, int size) {
        return postRepository.search(q, PageRequest.of(page, size));
    }

    @Transactional
    public int ensurePostsForExistingAudios() {
        int created = 0;

        for (Media media : mediaRepository.findAll()) {
            if (media.getType() != Media.MediaType.AUDIO || postRepository.existsByMediaId(media.getId())) {
                continue;
            }

            createAutomaticPost(media.getId());
            created++;
        }

        return created;
    }

    @Transactional
    public Post createAutomaticPost(Long mediaId) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Média introuvable"));

        if (media.getType() != Media.MediaType.AUDIO) {
            throw new IllegalArgumentException("La création automatique de post concerne uniquement les audios");
        }

        if (postRepository.existsByMediaId(mediaId)) {
            return postRepository.findByMediaId(mediaId)
                    .orElseThrow(() -> new RuntimeException("Post déjà existant mais introuvable"));
        }

        if (media.getStatus() == Media.MediaStatus.NEW) {
            mediaAnalyzerService.analyzeMedia(mediaId);
            media = mediaRepository.findById(mediaId)
                    .orElseThrow(() -> new RuntimeException("Média introuvable après analyse"));
        }

        java.util.Map<String, Object> suggestion = mediaAnalyzerService.suggestMetadata(media);
        Post post = Post.builder()
                .media(media)
                .author(resolveAuthor(media))
                .postedBy(resolvePostedBy())
                .title(extractTitle(suggestion, media))
                .description("")
                .tags(extractTags(suggestion))
                .build();

        Post savedPost = postRepository.save(post);
        media.setStatus(Media.MediaStatus.PUBLISHED);
        mediaRepository.save(media);
        return savedPost;
    }

    private String extractTitle(java.util.Map<String, Object> suggestion, Media media) {
        Object title = suggestion.get("title");
        if (title instanceof String suggestedTitle && !suggestedTitle.isBlank()) {
            return suggestedTitle;
        }

        String filename = media.getFilename();
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    private java.util.List<String> extractTags(java.util.Map<String, Object> suggestion) {
        Object tags = suggestion.get("tags");
        if (!(tags instanceof java.util.List<?> rawTags)) {
            return new java.util.ArrayList<>();
        }

        return rawTags.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList();
    }

    private Author resolveAuthor(Media media) {
        String authorName = mediaAnalyzerService.extractAuthorName(media);
        if (authorName == null || authorName.isBlank()) {
            return authorRepository.findAll(PageRequest.of(0, 1)).stream()
                    .findFirst()
                    .orElseGet(() -> authorRepository.save(Author.builder()
                            .name("DrKindo")
                            .bio("Auteur auto-généré")
                            .build()));
        }

        return authorRepository.findByNameIgnoreCase(authorName)
                .orElseGet(() -> authorRepository.save(Author.builder()
                        .name(authorName)
                        .bio("Auteur auto-généré à partir du dossier " + authorName)
                        .build()));
    }

    private User resolvePostedBy() {
        return userRepository.findByUsername(adminUsername)
                .orElseGet(() -> userRepository.findAll(PageRequest.of(0, 1)).stream()
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("Aucun utilisateur disponible pour publier automatiquement")));
    }
}
