import Constants from 'expo-constants';
import { Linking, Platform, Text, View } from 'react-native';
import { Button, Card } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import type { WorkerLiveLocation } from '@/api';

declare const require: any;

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch {
    // Si el módulo nativo no está disponible, se utiliza el fallback visual.
  }
}

type MapPoint = {
  latitude: number;
  longitude: number;
  label?: string;
};

type Props = {
  destination: MapPoint | null;
  address?: string;
  worker?: WorkerLiveLocation | null;
  title: string;
  subtitle?: string;
};

function validPoint(
  point: {
    latitude: unknown;
    longitude: unknown;
    label?: string;
  } | null,
): MapPoint | null {
  if (!point) return null;

  if (
    point.latitude === null ||
    point.latitude === undefined ||
    point.latitude === '' ||
    point.longitude === null ||
    point.longitude === undefined ||
    point.longitude === ''
  ) {
    return null;
  }

  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  // Evita que una ubicación vacía termine convertida en 0,0.
  if (latitude === 0 && longitude === 0) {
    return null;
  }

  return {
    latitude,
    longitude,
    label: point.label,
  };
}

export default function RequestTrackingMap({
  destination,
  address,
  worker,
  title,
  subtitle,
}: Props) {
  const { palette } = useTheme();

  const mapsConfigured =
    Constants.expoConfig?.extra?.mapsConfigured === true;

  const destinationPoint = validPoint(destination);

  const workerPoint = validPoint(
    worker
      ? {
          latitude: worker.latitud,
          longitude: worker.longitud,
        }
      : null,
  );

  const center =
    workerPoint && destinationPoint
      ? {
          latitude:
            (workerPoint.latitude + destinationPoint.latitude) / 2,
          longitude:
            (workerPoint.longitude + destinationPoint.longitude) / 2,
        }
      : workerPoint ?? destinationPoint;

  const latitudeDelta =
    workerPoint && destinationPoint
      ? Math.max(
          Math.abs(
            workerPoint.latitude - destinationPoint.latitude,
          ) * 2.6,
          0.018,
        )
      : 0.018;

  const longitudeDelta =
    workerPoint && destinationPoint
      ? Math.max(
          Math.abs(
            workerPoint.longitude - destinationPoint.longitude,
          ) * 2.6,
          0.018,
        )
      : 0.018;

  const openExternal = () => {
    let query = '';

    if (destinationPoint) {
      query =
        `${destinationPoint.latitude},${destinationPoint.longitude}`;
    } else if (address?.trim()) {
      query = address.trim();
    }

    if (!query) return;

    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        query,
      )}`,
    );
  };

  const canRenderNativeMap =
    Boolean(center) &&
    Boolean(MapView) &&
    Boolean(Marker) &&
    mapsConfigured;

  return (
    <Card>
      <View style={{ gap: 4 }}>
        <Text
          style={{
            color: palette.text,
            fontWeight: '900',
            fontSize: 18,
          }}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={{
              color: palette.muted,
              lineHeight: 20,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {canRenderNativeMap ? (
        <MapView
          provider={
            Platform.OS === 'android'
              ? PROVIDER_GOOGLE
              : undefined
          }
          style={{
            width: '100%',
            height: 260,
            borderRadius: 16,
          }}
          region={{
            latitude: center!.latitude,
            longitude: center!.longitude,
            latitudeDelta,
            longitudeDelta,
          }}
          showsCompass
          showsScale
        >
          {destinationPoint ? (
            <Marker
              coordinate={destinationPoint}
              title="Domicilio del servicio"
              description={destinationPoint.label}
            />
          ) : null}

          {workerPoint ? (
            <Marker
              coordinate={workerPoint}
              title="Profesional en camino"
              description={worker?.fecha_actualizacion}
            />
          ) : null}
        </MapView>
      ) : center ? (
        <View
          style={{
            height: 150,
            borderRadius: 16,
            backgroundColor: palette.surface2,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: palette.text,
              fontWeight: '900',
            }}
          >
            Ubicación disponible
          </Text>

          <Text
            style={{
              color: palette.muted,
              textAlign: 'center',
            }}
          >
            El mapa interno todavía no está disponible en este
            build. Puedes abrir el domicilio en Google Maps.
          </Text>
        </View>
      ) : address?.trim() ? (
        <View
          style={{
            minHeight: 120,
            borderRadius: 16,
            backgroundColor: palette.surface2,
            justifyContent: 'center',
            padding: 18,
            gap: 8,
          }}
        >
          <Text
            style={{
              color: palette.text,
              fontWeight: '900',
            }}
          >
            Dirección disponible
          </Text>

          <Text
            style={{
              color: palette.muted,
              lineHeight: 20,
            }}
          >
            {address.trim()}
          </Text>

          <Text
            style={{
              color: palette.muted,
              fontSize: 12,
            }}
          >
            Esta solicitud no tiene coordenadas guardadas.
            Google Maps buscará la dirección escrita.
          </Text>
        </View>
      ) : (
        <Text style={{ color: palette.muted }}>
          La solicitud todavía no tiene una ubicación válida
          disponible.
        </Text>
      )}

      {destinationPoint || address?.trim() ? (
        <Button
          title="Abrir domicilio en Maps"
          variant="secondary"
          icon="navigate-outline"
          onPress={openExternal}
        />
      ) : null}

      {worker?.fecha_actualizacion ? (
        <Text
          style={{
            color: palette.muted,
            fontSize: 12,
          }}
        >
          Última ubicación del profesional:{' '}
          {new Date(
            worker.fecha_actualizacion,
          ).toLocaleString()}
        </Text>
      ) : null}
    </Card>
  );
}