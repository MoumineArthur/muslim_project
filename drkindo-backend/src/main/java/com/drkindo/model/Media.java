package com.drkindo.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "media")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Media {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String filename;

    @Column(nullable = false, unique = true)
    private String path;

    private Long duration;
    private Long size;
    private String mimeType;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MediaStatus status = MediaStatus.NEW;

    private Long durationMs;
    private Integer audioBitrate;

    @Column(length = 64)
    private String fileHash;

    @Enumerated(EnumType.STRING)
    private MediaType type;

    @Column(length = 120)
    private String detectedAuthor;

    private LocalDate contentDate;
    private Integer contentYear;
    private Integer contentMonth;
    private Integer contentDay;
    private Integer sequenceNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonIgnore
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @JsonIgnore
    private User uploadedBy;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private long playCount = 0;

    public enum MediaType {
        AUDIO, VIDEO
    }

    public enum MediaStatus {
        NEW, ANALYZED, PUBLISHED
    }
}
