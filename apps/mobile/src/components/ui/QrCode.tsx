import QRCode from 'qrcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii } from '@/theme';

const QUIET = 2; // quiet zone, in modules

/** Dark runs per row as [start, length], so a row is a few rectangles instead of one View per module. */
function darkRuns(value: string) {
  const { size, data } = QRCode.create(value, { errorCorrectionLevel: 'M' }).modules;
  const rows: [number, number][][] = [];
  for (let y = 0; y < size; y++) {
    const runs: [number, number][] = [];
    let start = -1;
    for (let x = 0; x <= size; x++) {
      const dark = x < size && data[y * size + x];
      if (dark && start < 0) start = x;
      else if (!dark && start >= 0) {
        runs.push([start, x - start]);
        start = -1;
      }
    }
    rows.push(runs);
  }
  return { size, rows };
}

/** QR code drawn with plain Views (no native SVG); `size` is the outer box incl. the quiet zone. */
export function QrCode({ value, size }: { value: string; size: number }) {
  const qr = useMemo(() => darkRuns(value), [value]);
  const cell = Math.max(1, Math.floor(size / (qr.size + QUIET * 2)));
  const box = cell * (qr.size + QUIET * 2);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="QR-код"
      style={[styles.box, { width: box, height: box, padding: cell * QUIET }]}>
      {qr.rows.map((runs, y) => (
        <View key={y} style={{ height: cell }}>
          {runs.map(([x, len]) => (
            <View key={x} style={[styles.dark, { left: x * cell, width: len * cell, height: cell }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.surface, borderRadius: radii.md },
  dark: { position: 'absolute', top: 0, backgroundColor: colors.text },
});
