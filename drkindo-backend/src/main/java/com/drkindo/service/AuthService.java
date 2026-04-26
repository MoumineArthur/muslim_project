package com.drkindo.service;

import com.drkindo.model.*;
import com.drkindo.repository.*;
import com.drkindo.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final AuthenticationManager authenticationManager;

    public Map<String, Object> register(String username, String email, String password) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Nom d'utilisateur déjà pris");
        }
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email déjà utilisé");
        }
        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .build();
        userRepository.save(user);
        String token = jwtUtils.generateToken(username);
        return Map.of("token", token, "username", username, "email", email);
    }

    public Map<String, Object> login(String username, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
        );
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
        String token = jwtUtils.generateToken(username);
        return Map.of("token", token, "username", username, "email", user.getEmail(), "id", user.getId());
    }
}
