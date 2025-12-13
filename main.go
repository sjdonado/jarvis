package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"jarvis/notifications"
	"jarvis/quotes"
	"jarvis/screen"
)

const (
	defaultFontSize  = 16
	defaultInterval  = 15 * time.Second
	quoteRefreshHour = 0
	quotesCachePath  = "quotes.json"
	screenHeightPx   = 250
	screenWidthPx    = 122
	topMargin        = 2
	bottomMargin     = 2
)

type fontOption struct {
	height int
	width  int
}

var fontOptions = []fontOption{
	{20, 14},
	{16, 11},
	{12, 7},
	{8, 5},
}

func wrapText(text string, maxChars int) []string {
	if maxChars <= 0 {
		return []string{text}
	}
	words := strings.Fields(text)
	if len(words) == 0 {
		return []string{}
	}
	lines := []string{}
	current := words[0]
	for _, w := range words[1:] {
		if len(current)+1+len(w) <= maxChars {
			current += " " + w
		} else {
			lines = append(lines, current)
			current = w
		}
	}
	lines = append(lines, current)
	return lines
}

func hardWrapIfNeeded(lines []string, maxChars int) []string {
	if maxChars <= 0 {
		return lines
	}
	var out []string
	for _, line := range lines {
		if len(line) <= maxChars {
			out = append(out, line)
			continue
		}
		// hard break long word/line
		for start := 0; start < len(line); start += maxChars {
			end := start + maxChars
			if end > len(line) {
				end = len(line)
			}
			out = append(out, line[start:end])
		}
	}
	return out
}

// prepareLines wraps quote+author at preferred font; only shrink font if it still won't fit vertically.
func prepareLines(q quotes.Quote, preferredHeight int) (lines []string, font fontOption) {
	contentHeight := screenWidthPx - topMargin - bottomMargin

	// resolve starting font (requested or default to Font16)
	startIdx := 1 // Font16 default index in fontOptions
	if preferredHeight > 0 {
		for i, f := range fontOptions {
			if f.height == preferredHeight {
				startIdx = i
				break
			}
		}
	}

	text := q.Quote

	// Try requested font first
	for i := startIdx; i < len(fontOptions); i++ {
		f := fontOptions[i]
		maxChars := screenHeightPx / f.width
		wrapped := wrapText(text, maxChars)
		wrapped = hardWrapIfNeeded(wrapped, maxChars)
		maxLines := contentHeight / f.height
		if maxLines < 1 {
			maxLines = 1
		}

		author := strings.TrimSpace(q.Author)
		authorLine := ""
		if author != "" {
			authorLine = "- " + author
			maxLines--
		}

		if len(wrapped) <= maxLines {
			if authorLine != "" {
				wrapped = append(wrapped, authorLine)
			}
			return wrapped, f
		}
		// only shrink if it doesn't fit; continue loop to smaller fonts
	}

	// Fallback: use smallest font, best effort
	f := fontOptions[len(fontOptions)-1]
	maxChars := screenHeightPx / f.width
	wrapped := wrapText(text, maxChars)
	wrapped = hardWrapIfNeeded(wrapped, maxChars)
	author := strings.TrimSpace(q.Author)
	if author != "" {
		wrapped = append(wrapped, "- "+author)
	}
	return wrapped, f
}

func nextDailyAtHour(hour int) time.Time {
	t := time.Now()
	y, m, d := t.Date()
	loc := t.Location()

	refreshHour := hour % 24
	if refreshHour < 0 {
		refreshHour += 24
	}

	candidate := time.Date(y, m, d, refreshHour, 0, 0, 0, loc)
	if !t.Before(candidate) {
		candidate = candidate.Add(24 * time.Hour)
	}
	log.Printf("Next quote refresh scheduled at %s", candidate.Format(time.RFC3339))
	return candidate
}

func main() {
	rotator, err := quotes.NewRotatorFromCache()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load quotes: %v\n", err)
		rotator = quotes.NewRotator([]quotes.Quote{{Quote: "No quotes available", Author: ""}})
	}
	q := rotator.NextQuote()

	if err := screen.TurnOn(); err != nil {
		fmt.Fprintf(os.Stderr, "Turn on failed: %v\n", err)
		os.Exit(1)
	}

	// Graceful shutdown
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(sigc)

	ticker := time.NewTicker(defaultInterval)
	defer ticker.Stop()

	refreshQuotesTimer := time.NewTimer(time.Until(nextDailyAtHour(quoteRefreshHour)))
	defer refreshQuotesTimer.Stop()

	if err := screen.Paint([]string{"Welcome :)"}, defaultFontSize); err != nil {
		fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
	}

	showQuote := true
	for {
		select {
		case <-sigc:
			screen.TurnOff()
			time.Sleep(4 * time.Second)
			return
		case <-ticker.C:
			if showQuote {
				lines, chosenFont := prepareLines(q, defaultFontSize)
				if err := screen.Paint(lines, chosenFont.height); err != nil {
					fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
				}
			} else {
				lines := notifications.BuildLines(time.Now(), rotator.LastFetch)
				if err := screen.Paint(lines, defaultFontSize); err != nil {
					fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
				}
			}
			showQuote = !showQuote
		case <-refreshQuotesTimer.C:
			rotator.Refresh()
			q = rotator.NextQuote()
			log.Printf("Quote refreshed at %s: %q — %s", time.Now().Format(time.RFC3339), q.Quote, q.Author)
			refreshQuotesTimer.Reset(time.Until(nextDailyAtHour(quoteRefreshHour)))
		}
	}
}
