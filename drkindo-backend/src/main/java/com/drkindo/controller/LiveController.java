package com.drkindo.controller;

import lombok.*;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Controller
@RequiredArgsConstructor
public class LiveController {
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<String, String> activeLives = new ConcurrentHashMap<>();

    @MessageMapping("/live/start")
    public void startLive(@Payload LiveMessage msg) {
        activeLives.put(msg.username, msg.roomId);
        messagingTemplate.convertAndSend("/topic/live/list", activeLives);
    }

    @MessageMapping("/live/stop")
    public void stopLive(@Payload LiveMessage msg) {
        activeLives.remove(msg.username);
        messagingTemplate.convertAndSend("/topic/live/list", activeLives);
    }

    @MessageMapping("/live/signal/{roomId}")
    public void signal(@DestinationVariable String roomId, @Payload Object signal) {
        messagingTemplate.convertAndSend("/topic/live/signal/" + roomId, signal);
    }

    @lombok.Data
    public static class LiveMessage {
        String username;
        String roomId;
    }
}
