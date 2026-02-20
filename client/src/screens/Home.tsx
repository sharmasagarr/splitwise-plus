import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSelector } from "../store/hooks";
import ProfileCard from "../components/ProfileCard";

const Home: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Show loading state while user data is being fetched
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </SafeAreaView>
    );
  }

  // Main content - pass individual props to ProfileCard
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ProfileCard 
          name={user.name}
          email={user.email}
          imageUrl={user.imageUrl}
        />
        
        {/* Add more sections here as needed */}
        <View style={styles.placeholderSection}>
          <Text style={styles.placeholderText}>
            More dashboard components here
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    alignItems: "center",
    padding: 32,
  },
  authContainer: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  authIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  authSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  placeholderSection: {
    marginTop: 24,
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  placeholderText: {
    fontSize: 14,
    color: "#94a3b8",
    fontStyle: "italic",
  },
});

export default Home;