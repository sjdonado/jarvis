package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"time"

	"jarvis/lib/screen"
)

type quote struct {
	Quote  string `json:"quote"`
	Author string `json:"author"`
}

func loadQuotes(path string) ([]quote, error) {
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

func pickRandomQuote(qs []quote) quote {
	if len(qs) == 0 {
		return quote{Quote: "No quotes available", Author: ""}
	}
	rand.Seed(time.Now().UnixNano())
	return qs[rand.Intn(len(qs))]
}

func main() {
	var (
		flagOn       = flag.Bool("on", false, "Turn the display on and show a random quote")
		flagOff      = flag.Bool("off", false, "Turn the display off")
		flagFontSize = flag.Int("font-size", 16, "Optional font height (8,12,16,20)")
		flagQuotes   = flag.String("quotes", "quotes.json", "Path to quotes JSON")
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

	qs, err := loadQuotes(*flagQuotes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load quotes: %v\n", err)
		os.Exit(1)
	}
	q := pickRandomQuote(qs)

	if err := screen.TurnOn(); err != nil {
		fmt.Fprintf(os.Stderr, "Turn on failed: %v\n", err)
		os.Exit(1)
	}

	lines := []string{q.Quote}
	if q.Author != "" {
		lines = append(lines, "- "+q.Author)
	}

	if err := screen.Paint(lines, *flagFontSize); err != nil {
		fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
		os.Exit(1)
	}
}
