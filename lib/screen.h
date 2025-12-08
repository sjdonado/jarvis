#ifndef SCREEN_H
#define SCREEN_H

#include <stdbool.h>

bool screen_turn_on(void);
void screen_turn_off(void);
bool screen_paint(const char **lines, int line_count, int font_height);

#endif // SCREEN_H
