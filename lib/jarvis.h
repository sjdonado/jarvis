#ifndef JARVIS_H
#define JARVIS_H

#include <stdbool.h>

bool jarvis_turn_on(void);
void jarvis_turn_off(void);
bool jarvis_paint(const char **lines, int line_count, int font_height);

#endif // JARVIS_H
