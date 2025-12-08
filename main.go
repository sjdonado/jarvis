package main

/*
#cgo CFLAGS: -I${SRCDIR}/lib -I${SRCDIR}/lib/epd -I${SRCDIR}/lib/epd/Config -I${SRCDIR}/lib/epd/GUI -I${SRCDIR}/lib/epd/Fonts -march=armv6 -mfpu=vfp -mfloat-abi=hard
#cgo LDFLAGS: -L${SRCDIR} -ljarvis -L${SRCDIR}/lib/libbcm2835/lib -lbcm2835 -lm -lpthread
#include "lib/jarvis.h"
#include <stdlib.h>
*/
import "C"
import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"time"
	"unsafe"
)

type quote struct {
	Quote  string `json:"quote"`
	Author string `json:"author"`
}

// TurnOn initializes the display and powers it up.
func TurnOn() error {
	if !bool(C.jarvis_turn_on()) {
		return errors.New("failed to turn on display")
	}
	return nil
}

// TurnOff powers down the display.
func TurnOff() {
	C.jarvis_turn_off()
}

// Paint renders the provided lines using an optional font height (use 0 for default).
func Paint(lines []string, fontHeight int) error {
	if len(lines) == 0 {
		return errors.New("no lines provided")
	}
	cLines := make([]*C.char, len(lines))
	for i, s := range lines {
		cLines[i] = C.CString(s)
	}
	defer func() {
		for _, p := range cLines {
			C.free(unsafe.Pointer(p))
		}
	}()

	if !bool(C.jarvis_paint((**C.char)(unsafe.Pointer(&cLines[0])), C.int(len(lines)), C.int(fontHeight))) {
		return errors.New("paint failed")
	}
	return nil
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
		TurnOff()
		return
	}

	qs, err := loadQuotes(*flagQuotes)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to load quotes: %v\n", err)
		os.Exit(1)
	}
	q := pickRandomQuote(qs)

	if err := TurnOn(); err != nil {
		fmt.Fprintf(os.Stderr, "Turn on failed: %v\n", err)
		os.Exit(1)
	}

	lines := []string{q.Quote}
	if q.Author != "" {
		lines = append(lines, "- "+q.Author)
	}

	if err := Paint(lines, *flagFontSize); err != nil {
		fmt.Fprintf(os.Stderr, "Paint failed: %v\n", err)
		os.Exit(1)
	}
}
