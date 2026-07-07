# Inbox — remplaçant custom pour GoHighLevel

App Next.js qui affiche et gère tes SMS, courriels et appels/messages vocaux via
l'API GHL (Private Integration Token), avec notifications push natives.
Faite pour être déployée sur Vercel avec Supabase comme base de données.

## Déjà fait pour toi

- ✅ Token GHL configuré (`.env.local`)
- ✅ Projet Supabase relié (`hxazfmabgsajmcwrsyfa`)
- ✅ Clés VAPID générées (notifications push)
- ✅ Secret webhook généré

## `.env.local` — tout est rempli

`GHL_LOCATION_ID` et `SUPABASE_SERVICE_ROLE_KEY` sont maintenant remplis.
Seul `VAPID_SUBJECT` est encore un placeholder (`mailto:remplir@tondomaine.com`)
— remplace-le par ton vrai email si tu veux, ce n'est pas bloquant.

## Étapes à suivre dans Claude Code

1. **Installer les dépendances**
   ```
   npm install
   ```

2. **Créer les tables dans Supabase**
   Copie le contenu de `supabase/schema.sql` dans l'éditeur SQL de ton projet
   Supabase (`hxazfmabgsajmcwrsyfa` → SQL Editor) et exécute-le.

3. **Tester en local**
   ```
   npm run dev
   ```
   Ouvre http://localhost:3000 — tu devrais voir tes conversations GHL.

4. **Créer le repo GitHub** (Claude Code peut le faire avec `gh repo create`)
   ```
   git init
   git add .
   git commit -m "Inbox initial"
   gh repo create ton-nom-de-repo --private --source=. --push
   ```

5. **Connecter le repo à Vercel** (tu le fais manuellement, comme prévu)
   - Import du repo GitHub dans Vercel
   - Dans les Environment Variables de Vercel, ajoute **toutes** les valeurs
     de `.env.local` (Vercel ne lit jamais `.env.local` automatiquement)
   - Déploie

6. **Configurer les webhooks dans GHL** (tu t'en charges une fois l'app en ligne)
   Automations → Workflows → nouveau workflow :
   - Déclencheur : "Customer Replied" (pour SMS + Email) — fais-en un deuxième
     avec le déclencheur "Call Status" pour les appels/messages vocaux
   - Action : **Webhook**
     - URL : `https://ton-app.vercel.app/api/webhooks/ghl?secret=OJi70TAHgzjLlX6UsKbDOdPNlNiE_YI5lQ7u827MGcA`
     - Méthode : POST
     - Corps JSON — mappe ces champs avec les variables du workflow GHL :
       ```json
       {
         "conversationId": "{{conversation.id}}",
         "contactId": "{{contact.id}}",
         "contactName": "{{contact.name}}",
         "phone": "{{contact.phone}}",
         "email": "{{contact.email}}",
         "type": "SMS",
         "body": "{{message.body}}"
       }
       ```
       Ajuste `"type"` à `"Email"`, `"Call"` ou `"Voicemail"` selon le workflow
       (le code accepte aussi `messageType` s'il vient nativement de GHL).
     - Pour les appels, ajoute aussi `"recordingUrl"` et `"callDuration"` si
       ces variables existent dans ton compte GHL.

7. **Tester bout en bout**
   - Envoie-toi un SMS test vers ton numéro GHL
   - Le workflow devrait déclencher le webhook → message stocké dans Supabase
     → notification push sur ton appareil (clique sur "Activer les
     notifications" dans l'app d'abord)

## Structure du projet

```
src/
  app/
    page.tsx                     Interface principale (3 colonnes)
    api/
      conversations/             Liste des conversations (lit GHL en direct)
      conversations/[id]/messages/  Messages d'une conversation (lit GHL)
      messages/send/             Envoi SMS/Email sortant (écrit vers GHL)
      webhooks/ghl/              Réception des messages entrants (GHL → nous)
      push/                      Abonnement + clé publique pour les push
      activity/                  Historique des messages entrants loggés
  lib/
    ghl.ts                       Client API GoHighLevel
    supabase.ts                  Client Supabase (service role, serveur seulement)
    push.ts                      Envoi des notifications push
    normalizeWebhook.ts          Normalise les payloads webhook GHL
  components/                    UI (sidebar, liste, thread, compose)
public/
  sw.js                          Service worker (réception des push)
supabase/
  schema.sql                     Tables à créer dans Supabase
```

## Limitations à connaître

- Les conversations et messages sont lus **en direct depuis GHL** à chaque
  ouverture (pas de cache complet) — Supabase sert pour le journal d'activité
  et les abonnements push, pas comme copie de toutes les conversations.
- Le rafraîchissement de la liste de conversations se fait par sondage
  (polling) toutes les 20 secondes en plus des notifications push, en cas
  d'échec d'un push.
- Un seul token GHL = un seul sous-compte à la fois. Pour gérer plusieurs
  sous-comptes, il faudrait dupliquer les variables d'environnement par
  sous-compte ou passer à un flux OAuth GHL (plus complexe).
