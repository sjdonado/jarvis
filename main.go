package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"

	"jarvis/screen"
)

type quote struct {
	Quote  string `json:"quote"`
	Author string `json:"author"`
}

const QUOTES_ENDPOINT = "https://gist.githubusercontent.com/sjdonado/66c22e7fafe4505bcbd7a167249bfd5f/raw/quotes.json"

func loadQuotes() ([]quote, error) {
	res, err := http.Get(QUOTES_ENDPOINT)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var qs []quote
	decoder := json.NewDecoder(res.Body)
	if err := decoder.Decode(&qs); err != nil {
		return nil, err
	}

	return qs, nil
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
	if q.Author != "" {
		text = fmt.Sprintf("%s - %s", q.Quote, q.Author)
	}

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
		if len(wrapped) <= maxLines {
			return wrapped, f
		}
		// only shrink if it doesn't fit; continue loop to smaller fonts
	}

	// Fallback: use smallest font, best effort
	f := fontOptions[len(fontOptions)-1]
	maxChars := screenHeightPx / f.width
	wrapped := wrapText(text, maxChars)
	wrapped = hardWrapIfNeeded(wrapped, maxChars)
	return wrapped, f
}

func main() {
	var (
		flagOn       = flag.Bool("on", false, "Turn the display on and show a random quote")
		flagOff      = flag.Bool("off", false, "Turn the display off")
		flagFontSize = flag.Int("font-size", 16, "Optional font height (8,12,16,20)")
	)
	flag.Parse()

	cmdCount := 0
	if *flagOn {
		cmdCount++
	}
	if *flagOff {
		cmdCount++
	}
	if cmdCount != 1 {
		fmt.Fprintf(os.Stderr, "Specify exactly one of --on or --off\n")
		flag.Usage()
		os.Exit(1)
	}

	if *flagOff {
		screen.TurnOff()
		return
	}

	qs, err := loadQuotes()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load quotes: %v\n", err)
		os.Exit(1)
	}
	q := pickRandomQuote(qs)

	if err := screen.TurnOn(); err != nil {
		fmt.Fprintf(os.Stderr, "Turn on failed: %v\n", err)
		os.Exit(1)
	}

	lines, chosenFont := prepareLines(q, *flagFontSize)

	if err := screen.Paint(lines, chosenFont.height); err != nil {
		fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
		os.Exit(1)
	}
}
