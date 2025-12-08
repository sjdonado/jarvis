package notifications

import (
	"fmt"
	"time"
)

func DaysUntil(target time.Time) int {
	now := time.Now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	end := time.Date(target.Year(), target.Month(), target.Day(), 0, 0, 0, 0, target.Location())
	if end.Before(start) {
		return 0
	}
	// Inclusive of end day
	d := end.Sub(start)
	return int(d.Hours()/24) + 1
}

func CountdownTargets(now time.Time) (int, int, int) {
	// End of current month
	firstNextMonth := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())
	lastDayThisMonth := firstNextMonth.Add(-24 * time.Hour)
	daysMonth := DaysUntil(lastDayThisMonth)

	// Next summer (June 20)
	nextSummer := time.Date(now.Year(), time.June, 20, 0, 0, 0, 0, now.Location())
	if !nextSummer.After(now) {
		nextSummer = time.Date(now.Year()+1, time.June, 20, 0, 0, 0, 0, now.Location())
	}
	daysSummer := DaysUntil(nextSummer)

	// Fixed date: 2028-09-30
	target := time.Date(2028, time.September, 30, 0, 0, 0, 0, now.Location())
	daysTarget := DaysUntil(target)

	return daysMonth, daysSummer, daysTarget
}

func BuildLines(now time.Time, lastFetch time.Time) []string {
	daysMonth, daysSummer, daysTarget := CountdownTargets(now)
	return []string{
		fmt.Sprintf("End of month: %d days", daysMonth),
		fmt.Sprintf("Next summer: %d days", daysSummer),
		fmt.Sprintf("30 Sep 2028: %d days", daysTarget),
		fmt.Sprintf("Updated: %s", lastFetch.Format("2006-01-02")),
	}
}
