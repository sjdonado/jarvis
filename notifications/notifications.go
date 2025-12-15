package notifications

import (
	"fmt"
	"time"
)

type entry struct {
	label string
	value string
}

func endOfQuarter(t time.Time) time.Time {
	quarter := (int(t.Month()) - 1) / 3
	endMonth := time.Month(quarter*3 + 3)
	firstNextMonth := time.Date(t.Year(), endMonth+1, 1, 0, 0, 0, 0, t.Location())
	return firstNextMonth.Add(-24 * time.Hour)
}

func quarterLabel(t time.Time) string {
	quarter := (int(t.Month())-1)/3 + 1
	return fmt.Sprintf("Q%d", quarter)
}

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

func BuildLines(now time.Time, _ time.Time) []string {
	daysMonth, daysSummer, daysTarget := CountdownTargets(now)
	daysQuarter := DaysUntil(endOfQuarter(now))
	qLabel := quarterLabel(now)

	items := []entry{
		{label: "End of month", value: fmt.Sprintf("%d days", daysMonth)},
		{label: fmt.Sprintf("End of %s", qLabel), value: fmt.Sprintf("%d days", daysQuarter)},
		{label: "Next summer", value: fmt.Sprintf("%d days", daysSummer)},
		{label: "30 Sep 2028", value: fmt.Sprintf("%d days", daysTarget)},
	}

	maxLabel := 0
	maxValue := 0
	for _, item := range items {
		if len(item.label) > maxLabel {
			maxLabel = len(item.label)
		}
		if len(item.value) > maxValue {
			maxValue = len(item.value)
		}
	}

	lines := make([]string, 0, len(items))
	for _, item := range items {
		lines = append(lines, fmt.Sprintf("%-*s %-*s", maxLabel, item.label, maxValue, item.value))
	}

	return lines
}
