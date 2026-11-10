// Kicktipp-Anstoßzeiten sind Berliner Ortszeit ohne Zeitzone; unabhängig von der Server-TZ auswerten.
process.env.TZ = 'Europe/Berlin';

export const kickoffDate = m => (m.kickoff ? new Date(m.kickoff) : null);
export const MATCH_MINUTES = 120;                       // Anstoß + 2 h ≈ Spielende inkl. Nachspielzeit/Pause
export const endOf = m => new Date(kickoffDate(m).getTime() + MATCH_MINUTES * 60_000);
