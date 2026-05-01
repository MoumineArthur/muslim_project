# 📋 Checklist de déploiement - MediaScannerService v2.0

## Phase 1️⃣ : Préparation (Avant de déployer)

- [ ] **Backup de la BD PostgreSQL**
  ```bash
  pg_dump drkindo_db > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Vérifier l'espace disque**
  ```bash
  # Au moins 2GB de libre
  df -h
  ```

- [ ] **Vérifier les logs existants**
  ```bash
  tail -100 /var/log/drkindo-backend.log
  ```

- [ ] **Backup du code**
  ```bash
  git commit -m "Backup avant MediaScannerService v2.0"
  ```

- [ ] **Vérifier la configuration application.yml**
  - `app.media.scan-path` correct?
  - `logging.level` approprié?

---

## Phase 2️⃣ : Compilation et build

- [ ] **Nettoyer et compiler**
  ```bash
  cd drkindo-backend
  mvn clean compile
  ```
  ✓ Vérifier : `BUILD SUCCESS`

- [ ] **Exécuter les tests**
  ```bash
  mvn test
  ```
  ✓ Vérifier : Tous les tests passent

- [ ] **Build du package**
  ```bash
  mvn package
  ```
  ✓ Vérifier : `target/drkindo-backend-1.0.0.jar` créé

- [ ] **Vérifier la taille du JAR**
  ```bash
  ls -lh target/*.jar
  # Doit être ~50-100MB
  ```

---

## Phase 3️⃣ : Tests en staging

- [ ] **Arrêter l'application actuelle**
  ```bash
  systemctl stop drkindo-backend
  # ou : kill -15 <PID>
  ```

- [ ] **Sauvegarder le JAR actuel**
  ```bash
  cp /app/drkindo-backend.jar /app/drkindo-backend.jar.backup
  ```

- [ ] **Copier le nouveau JAR**
  ```bash
  cp target/drkindo-backend-1.0.0.jar /app/drkindo-backend.jar
  ```

- [ ] **Démarrer l'application**
  ```bash
  java -jar /app/drkindo-backend.jar
  ```

- [ ] **Monitorer les logs au démarrage**
  ```bash
  tail -f /var/log/drkindo-backend.log | grep -E "SCAN|ERROR|WARN"
  ```

- [ ] **Vérifier le démarrage réussi**
  - Rechercher: `=== SCAN en cours ===`
  - Chercher: `=== SCAN terminé ===`
  - Pas d'erreurs FATAL

---

## Phase 4️⃣ : Validation des données

### Base de données

- [ ] **Vérifier les dossiers créés**
  ```sql
  SELECT COUNT(*) as total_folders FROM folders;
  SELECT COUNT(*) as orphelin_folders FROM folders WHERE parent_id IS NULL;
  ```
  ✓ Attendu: Quelques dossiers racines seulement

- [ ] **Vérifier les fichiers créés**
  ```sql
  SELECT COUNT(*) as total_media FROM media;
  SELECT COUNT(*) as media_without_folder FROM media WHERE folder_id IS NULL;
  ```
  ✓ Attendu: 0 fichiers sans dossier

- [ ] **Vérifier l'intégrité des références**
  ```sql
  SELECT COUNT(*) FROM folders f 
  WHERE f.parent_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM folders p WHERE p.id = f.parent_id);
  ```
  ✓ Attendu: 0 (pas d'orphelins)

- [ ] **Vérifier les chemins uniques**
  ```sql
  SELECT path, COUNT(*) as cnt FROM folders 
  GROUP BY path HAVING cnt > 1;
  ```
  ✓ Attendu: 0 lignes (pas de doublons)

### API REST

- [ ] **Tester l'API de récupération des dossiers**
  ```bash
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/folders
  ```
  ✓ Attendu: JSON avec hiérarchie correcte

- [ ] **Vérifier la hiérarchie dans la réponse**
  - Tous les dossiers ont `parent_id` ou `null` (racines)
  - Tous les fichiers ont `folder_id` valide

- [ ] **Tester les fichiers**
  ```bash
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/media
  ```
  ✓ Vérifier: Pas de `folder_id: null`

### Frontend

- [ ] **Vérifier l'arborescence des dossiers**
  - Les dossiers s'affichent correctement?
  - La navigation fonctionne?
  - Pas d'erreurs console?

- [ ] **Tester la navigation**
  - Cliquer sur un dossier racine
  - Vérifier les sous-dossiers
  - Cliquer sur un fichier
  - Vérifier qu'il peut être joué

- [ ] **Tester le breadcrumb** (s'il existe)
  - drkindo > TAFSIR-2014 > 01-JANVIER?

---

## Phase 5️⃣ : Performance et logs

- [ ] **Vérifier le temps de scan dans les logs**
  ```
  Résumé : X dossier(s) créé(s), Y fichier(s) indexé(s)
  ```
  ✓ Attendu: <10 secondes

- [ ] **Vérifier la mémoire utilisée**
  ```bash
  ps aux | grep java
  # Vérifier la colonne RSS (mémoire)
  ```
  ✓ Attendu: <1GB RAM

- [ ] **Vérifier le CPU**
  ```bash
  top -p <PID>
  ```
  ✓ Attendu: Retour à la normale après démarrage

- [ ] **Vérifier les connexions BD**
  ```bash
  netstat -an | grep 5432 | wc -l
  # Vérifier le pool de connexions
  ```

---

## Phase 6️⃣ : Smoke tests (10 minutes)

- [ ] **Affichage du home page**
  ```
  http://localhost:4200/
  ```
  ✓ Pas d'erreurs

- [ ] **Accès à l'explorateur de fichiers**
  ```
  http://localhost:4200/explorer
  ```
  ✓ Hiérarchie affichée

- [ ] **Lecteur audio/vidéo**
  - Cliquer sur un fichier media
  - Vérifier qu'il se joue
  ✓ Pas d'erreurs de lecture

- [ ] **Recherche** (si applicable)
  ```
  Chercher: "tafsir"
  ```
  ✓ Résultats affichés

- [ ] **Pagination** (si applicable)
  ```
  Aller à la page 2
  ```
  ✓ Fonctionne correctement

---

## Phase 7️⃣ : Monitorer 24h

- [ ] **Surveiller les logs**
  ```bash
  tail -f /var/log/drkindo-backend.log | tee monitoring.log
  ```
  - Pas d'erreurs répétées
  - Pas de memory leak
  - Pas de exceptions

- [ ] **Vérifier les requêtes BD**
  ```sql
  -- Vérifier les requêtes lentes
  SELECT query_start, query FROM pg_stat_activity 
  WHERE query_time > interval '1 second';
  ```

- [ ] **Monitorer l'espace disque**
  ```bash
  watch -n 60 'df -h'
  ```

- [ ] **Vérifier les connexions** (de temps en temps)
  ```bash
  netstat -an | grep 8080 | wc -l
  ```

---

## Phase 8️⃣ : Rollback (si problème)

- [ ] **Arrêter l'application**
  ```bash
  systemctl stop drkindo-backend
  ```

- [ ] **Restaurer l'ancien JAR**
  ```bash
  cp /app/drkindo-backend.jar.backup /app/drkindo-backend.jar
  ```

- [ ] **Restaurer la BD** (si nécessaire)
  ```bash
  psql drkindo_db < backup_YYYYMMDD_HHMMSS.sql
  ```

- [ ] **Redémarrer**
  ```bash
  systemctl start drkindo-backend
  ```

- [ ] **Vérifier**
  ```bash
  tail -f /var/log/drkindo-backend.log
  ```

---

## Phase 9️⃣ : Documentation post-déploiement

- [ ] **Documenter la date/heure du déploiement**
- [ ] **Documenter la version Java utilisée**
  ```bash
  java -version
  ```
- [ ] **Documenter les résultats du scan**
  - Nombre de dossiers créés
  - Nombre de fichiers indexés
  - Temps total

- [ ] **Mettre à jour CHANGELOG**
  ```markdown
  ## [2.0] - 2026-04-22
  - ✅ Hiérarchie des dossiers corrigée
  - ✅ Création récursive des parents
  - ✅ Cache en mémoire (+50% perf)
  - ✅ Nettoyage automatique
  ```

- [ ] **Partager les résultats avec l'équipe**

---

## Phase 🔟 : Post-déploiement

- [ ] **Planifier un rescan** (optionnel)
  ```bash
  # API endpoint (à créer si nécessaire)
  curl -X POST -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/admin/rescan
  ```

- [ ] **Planifier les backups BD**
  ```bash
  # Daily backup
  0 2 * * * pg_dump drkindo_db > /backups/drkindo_$(date +\%Y\%m\%d).sql
  ```

- [ ] **Monitorer les performances à long terme**
  - Vérifier les requêtes lentes après 1 semaine
  - Vérifier la croissance de la BD

- [ ] **Mettre à jour la documentation**
  - README.md
  - Configuration
  - Procédures d'exploitation

---

## Métriques à tracker

```
Date déploiement: ____________
Heure démarrage:  ____________
Heure scan fini:  ____________
Durée scan:       ______ secondes

Dossiers créés:   ______
Fichiers scannés: ______
Dossiers supprimés: ______
Fichiers supprimés: ______

Erreurs rencontrées: ☐ Aucune ☐ Oui (lesquelles?)
______________________________________

Performance:
- Mémoire RAM utilisée: ______MB
- CPU pic: ______%
- BD size: ______MB
- JAR size: ______MB

Statut global:
☐ ✅ Succès - Prêt pour production
☐ ⚠️  Avertissements - À monitorer
☐ ❌ Échoué - Rollback effectué
```

---

## Support d'urgence

**En cas de problème :**

1. Vérifier les logs
   ```bash
   grep ERROR /var/log/drkindo-backend.log
   ```

2. Vérifier la BD
   ```bash
   psql drkindo_db
   > SELECT COUNT(*) FROM folders;
   ```

3. Vérifier l'API
   ```bash
   curl http://localhost:8080/api/folders
   ```

4. Si incurable: **ROLLBACK**

---

**Checklist validée par:** ________________  
**Date de validation:** ________________  
**Signatures:** ________________

---

**Status:** ✅ Prêt à déployer
