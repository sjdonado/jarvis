package main

import (
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"jarvis/screen"
)

type quote struct {
	Quote  string `json:"quote"`
	Author string `json:"author"`
}

const QUOTES_ENDPOINT = "https://gist.githubusercontent.com/sjdonado/66c22e7fafe4505bcbd7a167249bfd5f/raw/quotes.json"
const defaultFontSize = 16
const defaultInterval = 15 * time.Second
const quoteRefreshHour = 0
const quotesCachePath = "quotes.json"

func loadQuotesFromFile(path string) ([]quote, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var qs []quote
	if err := json.Unmarshal(data, &qs); err != nil {
		return nil, err
	}
	return qs, nil
}

func fetchQuotesToFile(path string) error {
	resp, err := http.Get(QUOTES_ENDPOINT)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

func pickRandomQuote(qs []quote) quote {
	if len(qs) == 0 {
		return quote{Quote: "No quotes available", Author: ""}
	}
	rand.Seed(time.Now().UnixNano())
	return qs[rand.Intn(len(qs))]
}

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

const (
	screenHeightPx = 250
	screenWidthPx  = 122
	topMargin      = 2
	bottomMargin   = 3
)

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
func prepareLines(q quote, preferredHeight int) (lines []string, font fontOption) {
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

func daysUntil(target time.Time) int {
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

func countdownTargets(now time.Time) (int, int, int) {
	// End of current month
	firstNextMonth := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, now.Location())
	lastDayThisMonth := firstNextMonth.Add(-24 * time.Hour)
	daysMonth := daysUntil(lastDayThisMonth)

	// Next summer (June 20)
	nextSummer := time.Date(now.Year(), time.June, 20, 0, 0, 0, 0, now.Location())
	if !nextSummer.After(now) {
		nextSummer = time.Date(now.Year()+1, time.June, 20, 0, 0, 0, 0, now.Location())
	}
	daysSummer := daysUntil(nextSummer)

	// Fixed date: 2028-09-30
	target := time.Date(2028, time.September, 30, 0, 0, 0, 0, now.Location())
	daysTarget := daysUntil(target)

	return daysMonth, daysSummer, daysTarget
}

func buildNotificationLines(now time.Time, lastFetch time.Time) []string {
	daysMonth, daysSummer, daysTarget := countdownTargets(now)
	return []string{
		fmt.Sprintf("End of month: %d days", daysMonth),
		fmt.Sprintf("Next summer: %d days", daysSummer),
		fmt.Sprintf("30 Sep 2028: %d days", daysTarget),
		fmt.Sprintf("Updated: %s", lastFetch.Format("2006-01-02")),
	}
}

func main() {
	// Load cached quotes if present; otherwise fetch and cache.
	var qs []quote
	qs, err := loadQuotesFromFile(quotesCachePath)
	lastFetch := time.Now()
	if err != nil {
		if fetchErr := fetchQuotesToFile(quotesCachePath); fetchErr != nil {
			fmt.Fprintf(os.Stderr, "Failed to load quotes (no cache and fetch failed): %v\n", fetchErr)
			lastFetch = time.Time{}
		} else {
			qs, _ = loadQuotesFromFile(quotesCachePath)
			lastFetch = time.Now()
		}
	}
	q := pickRandomQuote(qs)

	if err := screen.TurnOn(); err != nil {
		fmt.Fprintf(os.Stderr, "Turn on failed: %v\n", err)
		os.Exit(1)
	}

	// Graceful shutdown
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigc
		screen.TurnOff()
		os.Exit(0)
	}()

	ticker := time.NewTicker(defaultInterval)
	defer ticker.Stop()

	// daily quote refresh at midnight
	quoteRefresh := time.NewTicker(time.Until(time.Now().Truncate(24 * time.Hour).Add(24 * time.Hour)))
	defer quoteRefresh.Stop()

	showQuote := true
	for {
		if showQuote {
			lines, chosenFont := prepareLines(q, defaultFontSize)
			if err := screen.Paint(lines, chosenFont.height); err != nil {
				fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
			}
		} else {
			lines := buildNotificationLines(time.Now(), lastFetch)
			if err := screen.Paint(lines, defaultFontSize); err != nil {
				fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
			}
		}
		showQuote = !showQuote

		select {
		case <-ticker.C:
		case <-quoteRefresh.C:
			quoteRefresh.Reset(24 * time.Hour)
			if fetchErr := fetchQuotesToFile(quotesCachePath); fetchErr == nil {
				if newQs, err := loadQuotesFromFile(quotesCachePath); err == nil && len(newQs) > 0 {
					qs = newQs
					lastFetch = time.Now()
				}
			}
			q = pickRandomQuote(qs)
		}
	}
}
