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
import { Feather } from "@expo/vector-icons";

import Screen from "../ui/components/Screen";
import Card from "../ui/components/Card";
import Button from "../ui/components/Button";
import TextField from "../ui/components/TextField";
import { theme } from "../ui/theme";
import { AppTabsParamList, ProfileStackParamList } from "../navigation";
import appConfig from "../../app.json";

type BaseCategory = "Cuenta" | "Tarjeta" | "Pagos" | "Seguridad" | "Comercios";
type CategoryFilter = "Todos" | BaseCategory;

type FaqItem = {
  id: string;
  category: BaseCategory;
  question: string;
  answer: string;
};

const CATEGORY_OPTIONS: CategoryFilter[] = ["Todos", "Cuenta", "Tarjeta", "Pagos", "Seguridad", "Comercios"];

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
    question: "¿Cómo recibo mi tarjeta digital o token de canje?",
    answer:
      "Te llega por SMS o correo con un enlace seguro. Al abrirlo verás tu tarjeta digital y tu código visible. No compartas capturas del código."
  },
  {
    id: "donde-usar",
    category: "Comercios",
    question: "¿Dónde puedo usar Papayal?",
    answer:
      "Solo en comercios aprobados por Papayal (supermercados, farmacias, retail, comida). Verifica la lista dentro del token o pregunta en caja si aceptan Papayal."
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
      "En tu token verás saldo disponible y últimos canjes. Si un comercio devuelve un monto, también aparecerá como reverso."
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
      "La mayoría tiene vigencia de 12 meses desde la emisión. La fecha aparece en tu token. Antes de vencer te avisamos con recordatorios."
  },
  {
    id: "reembolso",
    category: "Pagos",
    question: "¿Hay reembolsos o reversos?",
    answer:
      "Si el comercio anula la compra el mismo día, se reversa de inmediato. Reversos posteriores pueden tardar hasta 48 horas hábiles en reflejarse."
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
      "No. Tu token sigue protegido. Escríbenos y bloqueamos el código anterior y te emitimos uno nuevo si es necesario."
  },
  {
    id: "codigo-expuesto",
    category: "Seguridad",
    question: "Alguien vio mi código, ¿está en riesgo?",
    answer:
      "Si crees que alguien lo vio, contáctanos de inmediato para rotar el código. Evita compartir capturas y no publiques el QR."
  },
  {
    id: "login",
    category: "Cuenta",
    question: "No recibo el código SMS para entrar",
    answer:
      "Revisa tu señal y que el número tenga formato internacional. Si no llega, prueba reenviar en 60 segundos o pide el código por email si está habilitado."
  },
  {
    id: "cambiar-numero",
    category: "Cuenta",
    question: "¿Puedo cambiar mi número de teléfono?",
    answer:
      "Sí. Escríbenos desde el correo registrado o un canal verificado indicando el número anterior y el nuevo. Por seguridad pedimos una verificación rápida."
  },
  {
    id: "costos",
    category: "Pagos",
    question: "¿Tiene comisiones o costos adicionales?",
    answer:
      "Recibir tu tarjeta no tiene costo. En comercios no cobramos comisión. Algunas recargas internacionales pueden incluir pequeña tarifa de procesamiento que verás antes de pagar."
  },
  {
    id: "tipo-cambio",
    category: "Pagos",
    question: "¿Qué tipo de cambio usan para mis recargas?",
    answer:
      "Usamos una tasa competitiva cercana al mercado del día y la mostramos antes de que aceptes. No hacemos ajustes posteriores al canje."
  },
  {
    id: "comprobante",
    category: "Comercios",
    question: "¿Recibo comprobante o factura?",
    answer:
      "El comercio entrega su comprobante habitual. En tu token verás el registro del canje con fecha, comercio y monto."
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
      "Respondemos en menos de 24 horas hábiles. En horarios pico de comercios priorizamos casos de pago en curso."
  }
];

const quickActions: { label: string; category: BaseCategory; icon: keyof typeof Feather.glyphMap }[] = [
  { label: "¿Cómo usar mi tarjeta?", category: "Tarjeta", icon: "credit-card" },
  { label: "Canjear en comercio", category: "Comercios", icon: "shopping-bag" },
  { label: "Problemas comunes", category: "Pagos", icon: "help-circle" },
  { label: "Seguridad", category: "Seguridad", icon: "shield" }
];

type HelpNav = NativeStackNavigationProp<ProfileStackParamList>;

const HelpScreen: React.FC = () => {
  const navigation = useNavigation<HelpNav>();
  const tabNavigation = navigation.getParent<NavigationProp<AppTabsParamList>>();

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

  const appVersion = appConfig?.expo?.version ?? "1.0.0";

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return FAQS.filter((faq) => {
      const matchesCategory = selectedCategory === "Todos" ? true : faq.category === selectedCategory;
      const matchesQuery = query
        ? `${faq.question} ${faq.answer}`.toLowerCase().includes(query)
        : true;
      return matchesCategory && matchesQuery;
    });
  }, [search, selectedCategory]);

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

  const handleLinkPress = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("No se pudo abrir el enlace", "Intenta de nuevo o escríbenos a soporte.");
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert("No se pudo abrir el enlace", "Intenta de nuevo o escríbenos a soporte.");
    }
  };

  const handleHome = () => {
    navigation.popToTop();
    tabNavigation?.navigate("HomeTab");
  };

  return (
    <Screen scrollable={false}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Ayuda</Text>
          <Text style={styles.subtitle}>Resuelve tus dudas rápidamente</Text>
        </View>
        <Button label="Inicio" variant="ghost" onPress={handleHome} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
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

          <View style={styles.faqList}>
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
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Contactar soporte</Text>
          <Text style={styles.sectionSubtitle}>Si no ves tu respuesta aquí, nuestro equipo puede ayudarte.</Text>
          <View style={styles.supportRow}>
            <Button
              label="Enviar email"
              variant="secondary"
              onPress={() => handleLinkPress("mailto:soporte@papayal.com")}
              style={styles.supportButton}
            />
            <Button
              label="WhatsApp"
              onPress={() => handleLinkPress("https://wa.me/593999000111")}
              style={styles.supportButton}
            />
          </View>
          <View style={styles.linksRow}>
            <Pressable style={styles.linkPill} onPress={() => handleLinkPress("https://papayal.com/terminos")}>
              <Text style={styles.linkText}>Ver términos</Text>
            </Pressable>
            <Pressable style={styles.linkPill} onPress={() => handleLinkPress("https://papayal.com/privacidad")}>
              <Text style={styles.linkText}>Ver privacidad</Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Papayal</Text>
          <Text style={styles.footerSubtitle}>Versión {appVersion}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1
  },
  scrollContent: {
    gap: theme.spacing(1.5),
    paddingBottom: theme.spacing(4)
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
    fontWeight: "800",
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
    fontWeight: "700",
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
    fontWeight: "700",
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
    fontWeight: "600",
    fontSize: theme.typography.small
  },
  chipLabelActive: {
    color: "#fff"
  },
  faqList: {
    gap: theme.spacing(1)
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
    fontWeight: "600"
  },
  faqQuestion: {
    fontSize: theme.typography.body,
    fontWeight: "700",
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
    fontWeight: "700",
    color: theme.colors.text
  },
  emptySubtitle: {
    color: theme.colors.muted,
    textAlign: "center"
  },
  supportRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  supportButton: {
    flex: 1,
    minWidth: 140
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  linkPill: {
    paddingVertical: theme.spacing(0.75),
    paddingHorizontal: theme.spacing(1.5),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background
  },
  linkText: {
    color: theme.colors.secondary,
    fontWeight: "700",
    fontSize: theme.typography.small
  },
  footer: {
    alignItems: "center",
    gap: theme.spacing(0.25),
    marginTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(1)
  },
  footerTitle: {
    fontSize: theme.typography.body,
    fontWeight: "700",
    color: theme.colors.text
  },
  footerSubtitle: {
    color: theme.colors.muted
  }
});

export default HelpScreen;


