import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { isNightTaken, monthGrid, monthLabel, pickDay } from "@/lib/calendar";
import type { Range } from "@/lib/calendar";
import { cn } from "./cn";
import { Icon } from "./icon";
import { IconButton } from "./icon-button";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Month grid for choosing check-in and check-out. Taken nights and past days are dimmed and can't start a stay.
 * A day that is another guest's check-in can still end yours. The server checks again at checkout.
 */
export function DateRangeCalendar({
  checkIn,
  checkOut,
  onChange,
  blocked,
  today,
  className,
}: {
  checkIn: string | null;
  checkOut: string | null;
  onChange: (value: { checkIn: string | null; checkOut: string | null }) => void;
  blocked: Range[];
  /** Local "YYYY-MM-DD". Earlier days are disabled. */
  today: string;
  className?: string;
}) {
  const [cursor, setCursor] = useState(() => ({ year: Number((checkIn ?? today).slice(0, 4)), month: Number((checkIn ?? today).slice(5, 7)) - 1 }));
  const current = { checkIn, checkOut };
  const days = monthGrid(cursor.year, cursor.month);
  const step = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = month + delta;
      return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
    });
  const atCurrentMonth = cursor.year === Number(today.slice(0, 4)) && cursor.month <= Number(today.slice(5, 7)) - 1;

  return (
    <View className={cn("gap-3", className)}>
      <View className="flex-row items-center justify-between">
        <IconButton label="Previous month" variant="outline" disabled={atCurrentMonth} onPress={() => step(-1)}>
          <Icon icon={ChevronLeft} className={atCurrentMonth ? "text-muted" : "text-ink"} />
        </IconButton>
        <Text variant="title-sm" accessibilityRole="header">
          {monthLabel(cursor.year, cursor.month)}
        </Text>
        <IconButton label="Next month" variant="outline" onPress={() => step(1)}>
          <Icon icon={ChevronRight} />
        </IconButton>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((d, i) => (
          <View key={i} className="w-1/7 items-center">
            <Text variant="micro">{d}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {days.map((day, i) => {
          if (!day) return <View key={i} className="h-11 w-1/7" />;
          const next = pickDay(day, current, blocked, today);
          const isStart = day === checkIn;
          const isEnd = day === checkOut;
          const inside = !!checkIn && !!checkOut && day > checkIn && day < checkOut;
          const dimmed = !next || (day < today);
          const label = `${day}${isStart ? ", check-in" : ""}${isEnd ? ", check-out" : ""}${isNightTaken(day, blocked) ? ", unavailable" : ""}`;
          return (
            <View key={i} className={cn("h-11 w-1/7 items-center justify-center", inside && "bg-primary/30")}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: !next, selected: isStart || isEnd }}
                disabled={!next}
                hitSlop={0}
                onPress={() => next && onChange(next)}
                className={cn("size-10 items-center justify-center rounded-full", (isStart || isEnd) && "bg-primary")}
              >
                <Text
                  variant="small"
                  className={cn(isStart || isEnd ? "text-on-primary" : dimmed ? "text-muted opacity-40" : "text-ink")}
                >
                  {Number(day.slice(8))}
                </Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </View>
  );
}
