// src/main/java/com/dss/brechasdigitales/service/PrioritizationService.java
package com.dss.brechasdigitales.service;

import com.dss.brechasdigitales.entity.SimplifiedObservation;
import com.dss.brechasdigitales.repository.SimplifiedObservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PrioritizationService {

    @Autowired
    private SimplifiedObservationRepository observationRepository;

    public List<PriorityRegion> getPriorityRegions(String indicatorName, int minYear, int maxYear, String ageLabel) {
        // Obtener datos relevantes
        List<SimplifiedObservation> observations;

        if (ageLabel != null && !ageLabel.isEmpty()) {
            observations = observationRepository
                .findByIndicatorNameAndTimePeriodBetweenAndAgeLabel(indicatorName, minYear, maxYear, ageLabel);
        } else {
            observations = observationRepository
                .findByIndicatorNameAndTimePeriodBetween(indicatorName, minYear, maxYear);
        }

        // Agrupar por país y calcular métricas de priorización
        Map<String, List<SimplifiedObservation>> byCountry = observations.stream()
            .collect(Collectors.groupingBy(SimplifiedObservation::getCountryCode));

        List<PriorityRegion> priorities = new ArrayList<>();

        for (Map.Entry<String, List<SimplifiedObservation>> entry : byCountry.entrySet()) {
            String countryCode = entry.getKey();
            List<SimplifiedObservation> countryData = entry.getValue();

            if (countryData.size() < 2) continue; // Necesitamos al menos 2 puntos de datos

            // Última observación (para valor actual y año más reciente)
            SimplifiedObservation latestObs = countryData.stream()
                .max(Comparator.comparingInt(SimplifiedObservation::getTimePeriod))
                .orElse(null);

            if (latestObs == null) continue;

            double latestValue = latestObs.getObsValue();

            // === TU LÓGICA SOLICITADA ===
            double growthRatePct = calculateGrowthRate(countryData); // p.ej. 503.98 (%)

            // Necesidad por crecimiento: si crece mucho → poca necesidad; si no crece o cae → mucha necesidad
            // Clamp a [0,1] y luego invertimos.
            double growthNeed = 1.0 - Math.min(1.0, Math.max(0.0, (growthRatePct / 100.0))); // 0..1

            double gapToTarget = calculateGapToTarget(latestValue);     // 0..1 (más lejos del 100 → mayor)
            double populationFactor = getPopulationFactor(countryCode); // 0..1

            // Pesos centrados en "necesidad"
            double priorityScore = (gapToTarget * 0.60) + (growthNeed * 0.25) + (populationFactor * 0.15);
            // ============================

            priorities.add(new PriorityRegion(
                countryCode,
                latestObs.getCountryName(),
                latestValue,
                growthRatePct,  // mantenemos el % de crecimiento original para mostrarlo en la UI
                priorityScore,
                latestObs.getTimePeriod()
            ));
        }

        // Ordenar por prioridad (mayor score primero)
        priorities.sort((a, b) -> Double.compare(b.getPriorityScore(), a.getPriorityScore()));

        return priorities;
    }

    private double calculateGrowthRate(List<SimplifiedObservation> data) {
        // Ordenar por año
        data.sort(Comparator.comparingInt(SimplifiedObservation::getTimePeriod));

        double oldestValue = data.get(0).getObsValue();
        double newestValue = data.get(data.size() - 1).getObsValue();

        if (oldestValue == 0) return 0; // Evitar división por cero

        // % de crecimiento (puede ser negativo si empeora)
        return ((newestValue - oldestValue) / oldestValue) * 100.0;
    }

    private double calculateGapToTarget(double currentValue) {
        // Target de 100 (por 100 habitantes, p.ej.). Resultado en 0..1
        double target = 100.0;
        return Math.max(0.0, (target - currentValue) / target);
    }

    private double getPopulationFactor(String countryCode) {
        // Datos de población aproximados (deberían venir de una base de datos). 0..1
        Map<String, Double> populationData = new HashMap<>();
        populationData.put("AFG", 0.5);
        populationData.put("USA", 0.9);
        populationData.put("CHN", 0.95);
        populationData.put("IND", 0.8);
        populationData.put("BRA", 0.7);
        populationData.put("IDN", 0.6);
        populationData.put("PAK", 0.5);
        populationData.put("NGA", 0.5);
        populationData.put("BGD", 0.4);
        populationData.put("RUS", 0.8);

        return populationData.getOrDefault(countryCode, 0.3);
    }

    // Clase DTO para los resultados
    public static class PriorityRegion {
        private String countryCode;
        private String countryName;
        private double currentValue;
        private double growthRate;     // % (lo dejamos para la tabla)
        private double priorityScore;  // 0..1
        private int latestYear;

        public PriorityRegion(String countryCode, String countryName, double currentValue,
                              double growthRate, double priorityScore, int latestYear) {
            this.countryCode = countryCode;
            this.countryName = countryName;
            this.currentValue = currentValue;
            this.growthRate = growthRate;
            this.priorityScore = priorityScore;
            this.latestYear = latestYear;
        }

        // Getters y setters
        public String getCountryCode() { return countryCode; }
        public void setCountryCode(String countryCode) { this.countryCode = countryCode; }

        public String getCountryName() { return countryName; }
        public void setCountryName(String countryName) { this.countryName = countryName; }

        public double getCurrentValue() { return currentValue; }
        public void setCurrentValue(double currentValue) { this.currentValue = currentValue; }

        public double getGrowthRate() { return growthRate; }
        public void setGrowthRate(double growthRate) { this.growthRate = growthRate; }

        public double getPriorityScore() { return priorityScore; }
        public void setPriorityScore(double priorityScore) { this.priorityScore = priorityScore; }

        public int getLatestYear() { return latestYear; }
        public void setLatestYear(int latestYear) { this.latestYear = latestYear; }
    }
}
