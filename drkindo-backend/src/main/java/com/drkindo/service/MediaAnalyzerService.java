package com.drkindo.service;

import com.drkindo.model.Author;
import com.drkindo.model.Media;
import com.drkindo.repository.AuthorRepository;
import com.drkindo.repository.MediaRepository;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.text.Normalizer;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaAnalyzerService {
    private static final Pattern DR_KINDO_PATTERN = Pattern.compile("(?i)\\bdr\\s*[-_.]*\\s*kindo\\b");
    private static final Pattern YEAR_MONTH_DAY_PATTERN = Pattern.compile("\\b(19\\d{2}|20\\d{2})[-_/ .](0?[1-9]|1[0-2])[-_/ .](0?[1-9]|[12]\\d|3[01])\\b");
    private static final Pattern DAY_MONTH_YEAR_PATTERN = Pattern.compile("\\b(0?[1-9]|[12]\\d|3[01])[-_/ .](0?[1-9]|1[0-2])[-_/ .](19\\d{2}|20\\d{2})\\b");
    private static final Pattern YEAR_MONTH_PATTERN = Pattern.compile("\\b(19\\d{2}|20\\d{2})[-_/ .](0?[1-9]|1[0-2])\\b");
    private static final Pattern MONTH_YEAR_PATTERN = Pattern.compile("\\b(0?[1-9]|1[0-2])[-_/ .](19\\d{2}|20\\d{2})\\b");
    private static final Pattern YEAR_PATTERN = Pattern.compile("\\b(19\\d{2}|20\\d{2})\\b");
    private static final Pattern SEQUENCE_PATTERN = Pattern.compile("(^|[\\s_\\-.])([0-9]{1,3})(?=($|[\\s_\\-.]))");

    private final MediaRepository mediaRepository;
    private final AuthorRepository authorRepository;

    @Value("${app.media.scan-path}")
    private String mediaBasePath;

    @Transactional
    public void analyzeMedia(Long mediaId) {
        Media media = mediaRepository.findById(mediaId).orElseThrow();

        if (media.getStatus() != Media.MediaStatus.NEW) {
            log.info("Media {} is already analyzed or published", mediaId);
            return;
        }

        try {
            Path filePath = Paths.get(mediaBasePath).resolve(media.getPath());
            if (!Files.exists(filePath)) {
                log.error("File not found for media {}", mediaId);
                return;
            }

            media.setFileHash(computeSha256(filePath));
            applyExtractedMetadata(media);

            if (media.getSize() == null || media.getSize() == 0) {
                media.setSize(Files.size(filePath));
            }

            media.setStatus(Media.MediaStatus.ANALYZED);
            mediaRepository.save(media);
            log.info("Media {} analyzed successfully", mediaId);
        } catch (Exception e) {
            log.error("Error analyzing media {}", mediaId, e);
        }
    }

    public void applyExtractedMetadata(Media media) {
        ContentMetadata metadata = extractContentMetadata(media);
        media.setDetectedAuthor(metadata.getAuthorName());
        media.setContentDate(metadata.getContentDate());
        media.setContentYear(metadata.getContentYear());
        media.setContentMonth(metadata.getContentMonth());
        media.setContentDay(metadata.getContentDay());
        media.setSequenceNumber(metadata.getSequenceNumber());

        if (metadata.getAuthorName() != null && !metadata.getAuthorName().isBlank()) {
            authorRepository.findByNameIgnoreCase(metadata.getAuthorName())
                    .orElseGet(() -> authorRepository.save(Author.builder()
                            .name(metadata.getAuthorName())
                            .bio("Auto-genere a partir du contenu media")
                            .build()));
        }
    }

    public Map<String, Object> suggestMetadata(Media media) {
        String title = media.getFilename();
        if (title.contains(".")) {
            title = title.substring(0, title.lastIndexOf('.'));
        }
        title = title.replace("_", " ").replace("-", " ").replaceAll("(?i)cleaned", "").trim();

        Author suggestedAuthor = null;
        String authorName = extractAuthorName(media);
        if (authorName != null && !authorName.isBlank()) {
            suggestedAuthor = authorRepository.findByNameIgnoreCase(authorName).orElse(null);
        }

        String pathAndName = media.getFolder() != null 
            ? (media.getFolder().getPath() + " " + media.getFolder().getName()).toUpperCase() 
            : media.getPath().toUpperCase();
        
        List<String> tags = new java.util.ArrayList<>();
        if (pathAndName.contains("TAFSIR")) {
            tags.add("TAFSIR");
        } else if (pathAndName.contains("FATWA")) {
            tags.add("FATWA");
        } else {
            tags.add("DOUROUS");
        }

        return Map.of(
                "title", title,
                "author", suggestedAuthor != null ? suggestedAuthor : "",
                "tags", tags);
    }

    public String extractAuthorName(Media media) {
        return extractContentMetadata(media).getAuthorName();
    }

    public ContentMetadata extractContentMetadata(Media media) {
        String filename = media != null && media.getFilename() != null ? media.getFilename() : "";
        String folderPath = media != null && media.getFolder() != null && media.getFolder().getPath() != null
                ? media.getFolder().getPath()
                : "";
        return extractContentMetadata(folderPath, filename);
    }

    public ContentMetadata extractContentMetadata(String folderPath, String filename) {
        List<String> orderedCandidates = List.of(filename != null ? filename : "", folderPath != null ? folderPath : "");
        ExtractedDate extractedDate = extractDate(orderedCandidates);
        Integer sequenceNumber = extractSequenceNumber(orderedCandidates);
        String authorName = detectRepeatedAuthorName(orderedCandidates);

        return ContentMetadata.builder()
                .authorName(authorName != null ? authorName : "Dr Kindo")
                .contentDate(extractedDate.date())
                .contentYear(extractedDate.year())
                .contentMonth(extractedDate.month())
                .contentDay(extractedDate.day())
                .sequenceNumber(sequenceNumber)
                .build();
    }

    private String computeSha256(Path filePath) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream is = Files.newInputStream(filePath)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) > 0) {
                digest.update(buffer, 0, read);
            }
        }
        byte[] hashBytes = digest.digest();
        StringBuilder sb = new StringBuilder();
        for (byte b : hashBytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private String detectRepeatedAuthorName(List<String> candidates) {
        Map<String, Integer> scoreByVariant = new LinkedHashMap<>();

        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }

            String cleaned = stripExtension(candidate).replace('/', ' ').replace('\\', ' ');
            Matcher matcher = DR_KINDO_PATTERN.matcher(cleaned);
            while (matcher.find()) {
                scoreByVariant.merge("Dr Kindo", 3, Integer::sum);
            }

            List<String> parts = List.of(cleaned.split("[\\-_.,()\\[\\]\\s]+"));
            for (int i = 0; i < parts.size() - 1; i++) {
                String first = normalizeToken(parts.get(i));
                String second = normalizeToken(parts.get(i + 1));
                if (first.equals("dr") && second.equals("kindo")) {
                    scoreByVariant.merge("Dr Kindo", 2, Integer::sum);
                }
            }
        }

        return scoreByVariant.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private ExtractedDate extractDate(List<String> candidates) {
        Optional<ExtractedDate> fullDate = candidates.stream()
                .map(this::extractFullDate)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst();
        if (fullDate.isPresent()) {
            return fullDate.get();
        }

        Optional<ExtractedDate> monthDate = candidates.stream()
                .map(this::extractMonthDate)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst();
        if (monthDate.isPresent()) {
            return monthDate.get();
        }

        return candidates.stream()
                .map(this::extractYearOnly)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst()
                .orElse(new ExtractedDate(null, null, null, null));
    }

    private Optional<ExtractedDate> extractFullDate(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return Optional.empty();
        }

        Matcher ymd = YEAR_MONTH_DAY_PATTERN.matcher(candidate);
        if (ymd.find()) {
            int year = Integer.parseInt(ymd.group(1));
            int month = Integer.parseInt(ymd.group(2));
            int day = Integer.parseInt(ymd.group(3));
            return Optional.of(new ExtractedDate(LocalDate.of(year, month, day), year, month, day));
        }

        Matcher dmy = DAY_MONTH_YEAR_PATTERN.matcher(candidate);
        if (dmy.find()) {
            int day = Integer.parseInt(dmy.group(1));
            int month = Integer.parseInt(dmy.group(2));
            int year = Integer.parseInt(dmy.group(3));
            return Optional.of(new ExtractedDate(LocalDate.of(year, month, day), year, month, day));
        }

        return Optional.empty();
    }

    private Optional<ExtractedDate> extractMonthDate(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return Optional.empty();
        }

        Matcher ym = YEAR_MONTH_PATTERN.matcher(candidate);
        if (ym.find()) {
            int year = Integer.parseInt(ym.group(1));
            int month = Integer.parseInt(ym.group(2));
            return Optional.of(new ExtractedDate(LocalDate.of(year, month, 1), year, month, null));
        }

        Matcher my = MONTH_YEAR_PATTERN.matcher(candidate);
        if (my.find()) {
            int month = Integer.parseInt(my.group(1));
            int year = Integer.parseInt(my.group(2));
            return Optional.of(new ExtractedDate(LocalDate.of(year, month, 1), year, month, null));
        }

        return Optional.empty();
    }

    private Optional<ExtractedDate> extractYearOnly(String candidate) {
        if (candidate == null || candidate.isBlank()) {
            return Optional.empty();
        }

        Matcher yearMatcher = YEAR_PATTERN.matcher(candidate);
        if (!yearMatcher.find()) {
            return Optional.empty();
        }

        int year = Integer.parseInt(yearMatcher.group(1));
        return Optional.of(new ExtractedDate(LocalDate.of(year, 1, 1), year, null, null));
    }

    private Integer extractSequenceNumber(List<String> candidates) {
        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }

            Matcher matcher = SEQUENCE_PATTERN.matcher(stripExtension(candidate));
            while (matcher.find()) {
                int number = Integer.parseInt(matcher.group(2));
                if (number > 0 && number < 1000) {
                    return number;
                }
            }
        }
        return null;
    }

    private String stripExtension(String value) {
        int dot = value.lastIndexOf('.');
        return dot > 0 ? value.substring(0, dot) : value;
    }

    private String normalizeToken(String token) {
        return Normalizer.normalize(token == null ? "" : token, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^a-zA-Z]", "")
                .toLowerCase();
    }

    private record ExtractedDate(LocalDate date, Integer year, Integer month, Integer day) {
    }

    @lombok.Value
    @Builder
    public static class ContentMetadata {
        String authorName;
        LocalDate contentDate;
        Integer contentYear;
        Integer contentMonth;
        Integer contentDay;
        Integer sequenceNumber;
    }
}
