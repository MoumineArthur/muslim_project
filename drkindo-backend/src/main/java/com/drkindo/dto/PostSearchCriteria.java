package com.drkindo.dto;

import com.drkindo.model.Media;
import lombok.Data;

@Data
public class PostSearchCriteria {
    private String query;
    private Integer year;
    private Long authorId;
    private Long folderId;
    private Media.MediaType type;
}
