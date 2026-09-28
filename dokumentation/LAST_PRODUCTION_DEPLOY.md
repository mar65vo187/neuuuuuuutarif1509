# Firebase-Produktionsdeploy: noch nicht nachgewiesen

Der bisherige Vercel-Deploy-Vermerk ist historisch und bestätigt keinen aktuellen Livebetrieb. Das Repository wird auf Firebase App Hosting ausgerichtet; Netlify-Konfiguration und Netlify-Builddatei wurden entfernt.

Ein produktiver Firebase-Deploy kann aus dieser Entwicklungsumgebung noch nicht durchgeführt oder verifiziert werden, weil kein Firebase-Projektzugriff / Firebase-Login vorliegt und die produktive Datenbank, Backend-Verbindung sowie Domain nicht in der Umgebung konfiguriert sind.

Ein Deploy darf erst als erfolgreich dokumentiert werden, wenn:

- Firebase App Hosting das GitHub-Repository und den Produktionsbranch verbunden hat;
- die Firebase-PostgreSQL-Instanz und private VPC-Verbindung funktionieren;
- der Rollout gesund ist und `/api/ready` HTTP 200 mit `ok: true` liefert;
- Startseite, Anfrageformular und Portal-Login im Browser getestet sind;
- die benutzerdefinierte Domain mit aktivem HTTPS auf Firebase zeigt.
