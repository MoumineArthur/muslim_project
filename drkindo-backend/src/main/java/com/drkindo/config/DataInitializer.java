package com.drkindo.config;

import com.drkindo.model.User;
import com.drkindo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Valeurs configurables dans application.yml (avec des valeurs par défaut)
    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@drkindo.com}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@1234}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByUsername(adminUsername)) {
            User admin = User.builder()
                    .username(adminUsername)
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .role(User.Role.ADMIN)
                    .bio("Administrateur de la plateforme DrKindo")
                    .build();

            userRepository.save(admin);
            log.info("✅ Utilisateur ADMIN créé : username='{}', email='{}'", adminUsername, adminEmail);
        } else {
            log.info("ℹ️ L'utilisateur admin '{}' existe déjà, création ignorée.", adminUsername);
        }
    }
}
