import { parseInviteCode } from '@eatandcalc/shared';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Text } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

const FRAME = 240;

/** Full-screen QR scanner for an invite; calls `onCode` once with the normalized code. */
export function InviteScanner({ visible, onClose, onCode }: {
  visible: boolean;
  onClose: () => void;
  onCode: (code: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {visible ? <ScannerBody onClose={onClose} onCode={onCode} /> : null}
    </Modal>
  );
}

function ScannerBody({ onClose, onCode }: { onClose: () => void; onCode: (code: string) => void }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [wrongQr, setWrongQr] = useState(false);
  const done = useRef(false);

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (done.current) return;
    const code = parseInviteCode(data);
    if (!code) {
      setWrongQr(true);
      return;
    }
    done.current = true;
    onCode(code);
  };

  const close = (
    <IconButton
      icon="close"
      label="Закрыть"
      variant="plain"
      color={colors.onPrimary}
      onPress={onClose}
      style={{ ...styles.close, top: insets.top + spacing.sm }}
    />
  );

  if (!permission) return <View style={styles.root}>{close}</View>;

  if (!permission.granted) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text variant="bodyStrong" color={colors.onPrimary} style={styles.message}>
          Нет доступа к камере
        </Text>
        {permission.canAskAgain ? (
          <Button title="Разрешить камеру" onPress={requestPermission} />
        ) : (
          <Button title="Открыть настройки" onPress={() => Linking.openSettings()} />
        )}
        {close}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <View style={styles.frame} />
        <Text
          variant="bodyStrong"
          color={wrongQr ? colors.overSoft : colors.onPrimary}
          style={[styles.message, styles.hint]}>
          {wrongQr ? 'Это не QR-код приглашения' : 'Наведите камеру на QR-код'}
        </Text>
      </View>
      {close}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.camera },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  close: { position: 'absolute', left: spacing.md, backgroundColor: colors.scrim, borderRadius: radii.pill },
  frame: { width: FRAME, height: FRAME, borderWidth: 3, borderColor: colors.onPrimary, borderRadius: radii.lg },
  message: { textAlign: 'center' },
  hint: {
    backgroundColor: colors.scrim,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    overflow: 'hidden',
  },
});
