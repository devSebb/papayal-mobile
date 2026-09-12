import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View
} from "react-native";
import { NavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Application from "expo-application";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import BackButton from "../ui/components/BackButton";
import TextField from "../ui/components/TextField";
import { ListDivider, ListGroup, ListRow } from "../ui/components/ListRow";
import { theme } from "../ui/theme";
import { AppTabsParamList, ProfileStackParamList } from "../navigation";
import { shareApp } from "../sharing/shareApp";
import { useAppConfig } from "../hooks/useAppConfig";
import { centsToDollars, formatMoneyCompact } from "../utils/money";
import type { AppConfigLimits } from "../types/api";

type BaseCategory = "Cuenta" | "Tarjeta" | "Pagos" | "Seguridad" | "Comercios";
type CategoryFilter = "Todos" | BaseCategory;

type FaqItem = {
  id: string;
  category: BaseCategory;
  question: string;
  answer: string;
};

const CATEGORY_OPTIONS: CategoryFilter[] = ["Todos", "Cuenta", "Tarjeta", "Pagos", "Seguridad", "Comercios"];

/** Caps FAQ (§4.4). The numbers come from GET /config, never from the build. */
const limitsAnswer = (limits?: AppConfigLimits) => {
  if (!limits) {
    return "Sí, por seguridad hay límites por recarga, por día y de saldo máximo por tarjeta. Si necesitas más, escríbenos.";
  }
  const money = (cents: number) => formatMoneyCompact(centsToDollars(cents) ?? 0, "USD");
  return (
    `Sí, por seguridad: hasta ${money(limits.max_load_cents)} por recarga, ` +
    `${limits.max_loads_per_card_per_day} recargas y ${money(limits.max_daily_load_per_card_cents)} por tarjeta al día, ` +
    `y un saldo máximo de ${money(limits.max_card_balance_cents)} por tarjeta. Si necesitas más, escríbenos.`
  );
};

const FAQS: FaqItem[] = [
  {
    id: "que-es",
    category: "Cuenta",
    question: "¿Qué es Papayal y cómo funciona?",
    answer:
      "Papayal es una tarjeta de regalo digital que usas como saldo en comercios aliados en Ecuador. Recibes un token o código seguro, lo presentas en caja (QR o código), y se descuenta del saldo al instante."
  },
  {
    id: "recibir-token",
    category: "Tarjeta",
    question: "¿Cómo recibo mi tarjeta digital o código de canje?",
    answer:
      "Cuando alguien te envía una tarjeta de regalo, te avisamos por WhatsApp o correo y aparece en Mis tarjetas. El código de canje solo se muestra en la app cuando estés listo para pagar."
  },
  {
    id: "recargar",
    category: "Tarjeta",
    question: "¿Puedo recargar mi tarjeta?",
    answer:
      "Sí. Tienes una sola tarjeta por comercio y cada compra, tuya o de otra persona, se suma a esa tarjeta. Así nunca tienes saldos sueltos."
  },
  {
    id: "donde-usar",
    category: "Comercios",
    question: "¿Dónde puedo usar Papayal?",
    answer:
      "Solo en comercios aprobados por Papayal. Importante: por ahora, la mayoría de tarjetas se pagan en los locales de Medicity o Farmacias Económicas, nuestros socios de canje. Cada tarjeta te indica exactamente dónde pagar antes de canjearla."
  },
  {
    id: "canjear-qr",
    category: "Pagos",
    question: "¿Cómo canjeo con QR o código visible?",
    answer:
      "Muestra el QR o el código al cajero. Ellos escanean o digitan el código en su punto de pago. Confirma el monto antes de aceptar."
  },
  {
    id: "codigo-manual",
    category: "Pagos",
    question: "¿Puedo canjear dictando el código al cajero?",
    answer:
      "Sí. El cajero puede ingresar manualmente el código visible. Evita leerlo en voz alta si hay fila; muéstralo directamente."
  },
  {
    id: "saldo",
    category: "Tarjeta",
    question: "¿Cómo consulto mi saldo y movimientos?",
    answer:
      "En Mis tarjetas verás el saldo de cada tarjeta, tus recargas y tus últimos canjes. Si un comercio devuelve un monto, también aparecerá ahí."
  },
  {
    id: "parcial",
    category: "Pagos",
    question: "¿Puedo hacer canjes parciales?",
    answer:
      "Sí. Si el consumo es menor al saldo, se descuenta solo ese valor y puedes usar el resto después. Si es mayor, combina con otro medio de pago."
  },
  {
    id: "vencimiento",
    category: "Tarjeta",
    question: "¿Mi tarjeta expira?",
    answer:
      "No. Tus tarjetas de regalo digitales no vencen. El saldo queda en tu tarjeta hasta que lo uses."
  },
  {
    id: "reembolso",
    category: "Pagos",
    question: "¿Hay reembolsos o reversos?",
    answer:
      "Si te arrepientes de una recarga que aún no se ha usado, escríbenos dentro de las 72 horas y la devolvemos a la tarjeta de pago de quien la compró. Los saldos ya canjeados se gestionan con el comercio."
  },
  {
    id: "pago-rechazado",
    category: "Comercios",
    question: "El comercio rechazó mi pago, ¿qué hago?",
    answer:
      "Pide que verifiquen que aceptan Papayal y que el monto no supera tu saldo. Si persiste, prueba ingresar el código manualmente. Si aún falla, contáctanos con el nombre del comercio y hora."
  },
  {
    id: "perdi-telefono",
    category: "Seguridad",
    question: "Perdí mi teléfono, ¿pierdo mi saldo?",
    answer:
      "No. Tu saldo está asociado a tu cuenta, no al dispositivo. Inicia sesión con tu correo y contraseña desde otro teléfono. Si crees que alguien puede acceder a tu cuenta, escríbenos para revisar tu acceso."
  },
  {
    id: "codigo-expuesto",
    category: "Seguridad",
    question: "Alguien vio mi código, ¿está en riesgo?",
    answer:
      "Si crees que alguien vio tu código de canje, contáctanos de inmediato. Evita compartir capturas y no publiques el QR."
  },
  {
    id: "cambiar-numero",
    category: "Cuenta",
    question: "¿Puedo cambiar mi número de teléfono?",
    answer:
      "Sí. Entra a tu perfil, elige Editar perfil y actualiza tu número de teléfono. Los cambios se guardan al instante."
  },
  {
    id: "costos",
    category: "Pagos",
    question: "¿Tiene comisiones o costos adicionales?",
    answer:
      "Por ahora no cobramos comisiones al comprar ni al canjear tu tarjeta de regalo. Cualquier tarifa aplicable se muestra siempre en el resumen de compra, con el total exacto, antes de que pagues."
  },
  {
    id: "comprobante",
    category: "Comercios",
    question: "¿Recibo comprobante o factura?",
    answer:
      "El comercio entrega su comprobante habitual. En tu actividad verás el registro del canje con fecha, comercio y monto."
  },
  {
    id: "tiendas-online",
    category: "Comercios",
    question: "¿Puedo usar Papayal online y en tiendas físicas?",
    answer:
      "Depende del comercio. Algunos aceptan Papayal solo en tienda física, otros también online. Consulta en el comercio o en la lista de aliados."
  },
  {
    id: "seguridad-datos",
    category: "Seguridad",
    question: "¿Papayal almacena mis datos de forma segura?",
    answer:
      "Sí. Ciframos la información y rotamos identificadores sensibles. Nunca pediremos tu código completo por chat o teléfono."
  },
  {
    id: "soporte-tiempo",
    category: "Cuenta",
    question: "¿En cuánto tiempo responde soporte?",
    answer:
      "Normalmente respondemos dentro de un día hábil. Priorizamos los casos de pago o canje en curso."
  }
];

const quickActions: { label: string; category: BaseCategory; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "¿Cómo usar mi tarjeta?", category: "Tarjeta", icon: "credit-card" },
  { label: "Canjear en comercio", category: "Comercios", icon: "shopping-bag" },
  { label: "Problemas comunes", category: "Pagos", icon: "help-circle" },
  { label: "Seguridad", category: "Seguridad", icon: "shield" }
];

type HelpNav = NativeStackNavigationProp<ProfileStackParamList>;

const SUPPORT_EMAIL = "hola@papayal.app";

const HelpScreen: React.FC = () => {
  const navigation = useNavigation<HelpNav>();
  const tabNavigation = navigation.getParent<NavigationProp<AppTabsParamList>>();
  const tabBarHeight = useBottomTabBarHeight();

  const scrollRef = useRef<ScrollView>(null);
  const [faqSectionY, setFaqSectionY] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("Todos");
  const [search, setSearch] = useState("");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const appVersion = Application.nativeApplicationVersion;
  const { data: appConfig } = useAppConfig();

  // The caps entry is built at render time so it always states the limits the
  // server is currently enforcing (§4.1), not the ones shipped in this build.
  const faqs = useMemo<FaqItem[]>(
    () => [
      ...FAQS,
      {
        id: "limites",
        category: "Pagos",
        question: "¿Hay límites?",
        answer: limitsAnswer(appConfig?.limits)
      }
    ],
    [appConfig?.limits]
  );

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = selectedCategory === "Todos" ? true : faq.category === selectedCategory;
      const matchesQuery = query
        ? `${faq.question} ${faq.answer}`.toLowerCase().includes(query)
        : true;
      return matchesCategory && matchesQuery;
    });
  }, [faqs, search, selectedCategory]);

  const handleToggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectCategory = (category: CategoryFilter) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(category);
    setOpenItems(new Set());
  };

  const handleQuickAction = (category: BaseCategory) => {
    setSearch("");
    handleSelectCategory(category);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(faqSectionY - theme.spacing(2), 0), animated: true });
    });
  };

  // No canOpenURL gate: on iOS it always reports false for mailto unless the
  // scheme is declared in LSApplicationQueriesSchemes, so we just try to open
  // and surface the address if no mail app is available.
  const handleContactSupport = async () => {
    const subject = encodeURIComponent("Ayuda con Papayal");
    try {
      await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`);
    } catch (error) {
      Alert.alert(
        "Escríbenos por correo",
        `No pudimos abrir tu app de correo. Envíanos un mensaje a ${SUPPORT_EMAIL} y te respondemos en un día hábil.`
      );
    }
  };

  const handleHome = () => {
    // Navigate to Profile first to ensure we're in a valid state, then switch to HomeTab
    navigation.navigate("Profile");
    tabNavigation?.navigate("HomeTab");
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.headerRow}>
        {navigation.canGoBack() ? <BackButton onPress={() => navigation.goBack()} /> : null}
        <View style={styles.headerText}>
          <Text style={styles.title}>Ayuda</Text>
          <Text style={styles.subtitle}>Resuelve tus dudas rápidamente</Text>
        </View>
        <Button label="Inicio" variant="ghost" onPress={handleHome} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + theme.spacing(2) }]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Accesos rápidos</Text>
          <Text style={styles.sectionSubtitle}>Llega directo al tema que necesitas.</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.quickAction, pressed ? styles.quickActionPressed : null]}
                onPress={() => handleQuickAction(action.category)}
              >
                <View style={styles.quickIcon}>
                  <Feather name={action.icon} size={18} color={theme.colors.secondary} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
                <Text style={styles.quickHint}>Ver {action.category.toLowerCase()}</Text>
              </Pressable>
            ))}
          </View>
        </Card>

        <Card style={[styles.card, styles.faqCard]} onLayout={(event) => setFaqSectionY(event.nativeEvent.layout.y)}>
          <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
          <Text style={styles.sectionSubtitle}>Filtra por categoría o busca en tiempo real.</Text>
          <TextField
            placeholder="Buscar por palabra clave..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />

          <View style={styles.chipRow}>
            {CATEGORY_OPTIONS.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => handleSelectCategory(category)}
                  style={[styles.chip, isActive ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipLabel, isActive ? styles.chipLabelActive : null]}>{category}</Text>
                </Pressable>
              );
            })}
          </View>

          <ScrollView
            style={styles.faqScrollContainer}
            contentContainerStyle={styles.faqList}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {filteredFaqs.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather name="search" size={22} color={theme.colors.muted} />
                <Text style={styles.emptyTitle}>Sin resultados</Text>
                <Text style={styles.emptySubtitle}>Prueba con otra palabra clave o categoría.</Text>
              </View>
            ) : (
              filteredFaqs.map((faq) => {
                const isOpen = openItems.has(faq.id);
                return (
                  <View key={faq.id} style={styles.faqItem}>
                    <Pressable style={styles.faqHeader} onPress={() => handleToggle(faq.id)}>
                      <View style={styles.faqHeaderText}>
                        <View style={styles.faqBadge}>
                          <Text style={styles.faqBadgeText}>{faq.category}</Text>
                        </View>
                        <Text style={styles.faqQuestion}>{faq.question}</Text>
                      </View>
                      <Feather
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={theme.colors.secondary}
                      />
                    </Pressable>
                    {isOpen ? <Text style={styles.faqAnswer}>{faq.answer}</Text> : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Card>

        <View style={styles.supportSection}>
          <Text style={styles.supportLabel}>Contactar soporte</Text>
          <ListGroup>
            <ListRow
              icon="mail"
              variant="accent"
              title="Enviar email"
              subtitle={SUPPORT_EMAIL}
              onPress={handleContactSupport}
            />
            <ListDivider />
            <ListRow
              icon="share-2"
              title="Compartir Papayal"
              subtitle="Invita a tu familia y amigos"
              onPress={shareApp}
            />
            <ListDivider />
            <ListRow
              icon="file-text"
              title="Legal y privacidad"
              subtitle="Términos y políticas de datos"
              onPress={() => navigation.navigate("LegalPrivacy")}
            />
          </ListGroup>
        </View>

        <Text style={styles.version}>Papayal · Versión {appVersion ?? "—"}</Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    gap: theme.spacing(1.5)
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  headerText: {
    flex: 1,
    gap: theme.spacing(0.5)
  },
  title: {
    fontSize: 28,
    fontFamily: theme.fonts.extraBold,
    color: theme.colors.secondary
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body
  },
  card: {
    marginTop: theme.spacing(0.5)
  },
  sectionTitle: {
    fontSize: theme.typography.subheading,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(1)
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  quickAction: {
    flexBasis: "48%",
    backgroundColor: theme.colors.background,
    padding: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 108,
    justifyContent: "space-between",
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }
  },
  quickActionPressed: {
    opacity: 0.9
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  quickLabel: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    lineHeight: 22
  },
  quickHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.small
  },
  faqCard: {
    marginBottom: theme.spacing(0.5)
  },
  searchInput: {
    marginBottom: theme.spacing(1)
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  chip: {
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(1.5),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "transparent"
  },
  chipActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.secondary
  },
  chipLabel: {
    color: theme.colors.text,
    fontFamily: theme.fonts.semiBold,
    fontSize: theme.typography.small
  },
  chipLabelActive: {
    color: "#fff"
  },
  faqScrollContainer: {
    maxHeight: 600,
    borderRadius: theme.radius.md
  },
  faqList: {
    gap: theme.spacing(1),
    paddingBottom: theme.spacing(0.5)
  },
  faqItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.5),
    backgroundColor: theme.colors.card,
    shadowColor: theme.colors.secondary,
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(1)
  },
  faqHeaderText: {
    flex: 1,
    gap: theme.spacing(0.5)
  },
  faqBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    paddingVertical: theme.spacing(0.25),
    paddingHorizontal: theme.spacing(1),
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  faqBadgeText: {
    fontSize: theme.typography.small,
    color: theme.colors.muted,
    fontFamily: theme.fonts.semiBold
  },
  faqQuestion: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text,
    lineHeight: 22
  },
  faqAnswer: {
    marginTop: theme.spacing(1),
    color: theme.colors.muted,
    lineHeight: 22
  },
  emptyState: {
    alignItems: "center",
    padding: theme.spacing(2),
    gap: theme.spacing(0.75)
  },
  emptyTitle: {
    fontSize: theme.typography.body,
    fontFamily: theme.fonts.bold,
    color: theme.colors.text
  },
  emptySubtitle: {
    color: theme.colors.muted,
    textAlign: "center"
  },
  supportSection: {
    marginTop: theme.spacing(0.5)
  },
  supportLabel: {
    marginBottom: theme.spacing(1),
    paddingLeft: theme.spacing(0.5),
    color: theme.colors.secondary,
    fontFamily: theme.fonts.extraBold,
    fontSize: 16
  },
  version: {
    marginTop: theme.spacing(1),
    textAlign: "center",
    color: theme.colors.captionMuted,
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    letterSpacing: 0.3
  }
});

export default HelpScreen;

