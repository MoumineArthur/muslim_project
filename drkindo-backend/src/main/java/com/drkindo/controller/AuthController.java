package com.drkindo.controller;

import com.drkindo.service.AuthService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req.username, req.email, req.password));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req.username, req.password));
    }

    @Data static class RegisterRequest {
        @NotBlank String username;
        @Email @NotBlank String email;
        @Size(min = 6) String password;
    }

    @Data static class LoginRequest {
        @NotBlank String username;
        @NotBlank String password;
    }
}
