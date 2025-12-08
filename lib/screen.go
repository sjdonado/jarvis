package screen

/*
#cgo CFLAGS: -I${SRCDIR}/../lib -I${SRCDIR}/epd -I${SRCDIR}/epd/Config -I${SRCDIR}/epd/GUI -I${SRCDIR}/epd/Fonts -march=armv6 -mfpu=vfp -mfloat-abi=hard
#cgo LDFLAGS: -L${SRCDIR}/libbcm2835/lib -lbcm2835 -lm -lpthread
#include "screen.h"
#include <stdlib.h>
*/
import "C"
import (
	"errors"
	"unsafe"
)

// TurnOn initializes the display and powers it up.
func TurnOn() error {
	if !bool(C.screen_turn_on()) {
		return errors.New("failed to turn on display")
	}
	return nil
}

// TurnOff powers down the display.
func TurnOff() {
	C.screen_turn_off()
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

	if !bool(C.screen_paint((**C.char)(unsafe.Pointer(&cLines[0])), C.int(len(lines)), C.int(fontHeight))) {
		return errors.New("paint failed")
	}
	return nil
}
