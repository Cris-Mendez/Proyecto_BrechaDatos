// src/main/java/com/dss/brechasdigitales/service/PrioritizationService.java
package com.dss.brechasdigitales.service;

import com.dss.brechasdigitales.entity.SimplifiedObservation;
import com.dss.brechasdigitales.repository.SimplifiedObservationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service // Marca la clase como un servicio de Spring (gestión automática por el contenedor)
public class PrioritizationService {

    @Autowired
    private SimplifiedObservationRepository observationRepository; // Repositorio para consultar observaciones en BD

    /**
     * Calcula las regiones prioritarias en base a un indicador, rango de años y edad.
     * Combina métricas de valor actual, tasa de crecimiento, brecha hacia la meta
     * y factor poblacional para generar un "priorityScore".
     */
    public List<PriorityRegion> getPriorityRegions(String indicatorName, int minYear, int maxYear, String ageLabel) {
        // Obtener datos relevantes filtrados por indicador, rango de años y edad (si aplica)
        List<SimplifiedObservation> observations;

        if (ageLabel != null && !ageLabel.isEmpty()) {
            observations = observationRepository
                .findByIndicatorNameAndTimePeriodBetweenAndAgeLabel(indicatorName, minYear, maxYear, ageLabel);
        } else {
            observations = observationRepository
                .findByIndicatorNameAndTimePeriodBetween(indicatorName, minYear, maxYear);
        }

        // Agrupar las observaciones por código de país
        Map<String, List<SimplifiedObservation>> byCountry = observations.stream()
            .collect(Collectors.groupingBy(SimplifiedObservation::getCountryCode));

        List<PriorityRegion> priorities = new ArrayList<>();

        // Procesar cada país
        for (Map.Entry<String, List<SimplifiedObservation>> entry : byCountry.entrySet()) {
            String countryCode = entry.getKey();
            List<SimplifiedObservation> countryData = entry.getValue();

            if (countryData.size() < 2) continue; // Necesitamos al menos 2 puntos de datos para calcular crecimiento

            // Obtener la observación más reciente (último año disponible)
            SimplifiedObservation latestObs = countryData.stream()
                .max(Comparator.comparingInt(SimplifiedObservation::getTimePeriod))
                .orElse(null);

            if (latestObs == null) continue;

            double latestValue = latestObs.getObsValue();

            // Calcular tasa de crecimiento porcentual (%)
            double growthRatePct = calculateGrowthRate(countryData);

            // Calcular necesidad en base al crecimiento: más crecimiento = menos necesidad
            double growthNeed = 1.0 - Math.min(1.0, Math.max(0.0, (growthRatePct / 100.0))); // Normalizado [0..1]

            // Brecha hacia la meta (100)
            double gapToTarget = calculateGapToTarget(latestValue);

            // Factor poblacional estimado (simulado con valores hardcoded)
            double populationFactor = getPopulationFactor(countryCode);

            // Score final ponderado
            double priorityScore = (gapToTarget * 0.60) + (growthNeed * 0.25) + (populationFactor * 0.15);

            // Añadir región prioritaria a la lista
            priorities.add(new PriorityRegion(
                countryCode,
                latestObs.getCountryName(),
                latestValue,
                growthRatePct,   // se devuelve también para mostrar en la UI
                priorityScore,
                latestObs.getTimePeriod()
            ));
        }

        // Ordenar por score de prioridad descendente
        priorities.sort((a, b) -> Double.compare(b.getPriorityScore(), a.getPriorityScore()));

        return priorities;
    }

    /**
     * Calcula la tasa de crecimiento (%) entre el valor más antiguo y el más reciente.
     */
    private double calculateGrowthRate(List<SimplifiedObservation> data) {
        // Ordenar por año
        data.sort(Comparator.comparingInt(SimplifiedObservation::getTimePeriod));

        double oldestValue = data.get(0).getObsValue();
        double newestValue = data.get(data.size() - 1).getObsValue();

        if (oldestValue == 0) return 0; // Evitar división por cero

        return ((newestValue - oldestValue) / oldestValue) * 100.0;
    }

    /**
     * Calcula la brecha hacia un target de 100 (normalizado 0..1).
     */
    private double calculateGapToTarget(double currentValue) {
        double target = 100.0;
        return Math.max(0.0, (target - currentValue) / target);
    }

    /**
     * Devuelve un factor poblacional predefinido (0..1) según el código de país.
     * Si no está en la lista, se usa 0.3 por defecto.
     */
    private double getPopulationFactor(String countryCode) {
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

    // Clase DTO para representar los resultados de priorización
    public static class PriorityRegion {
        private String countryCode;    // Código del país (ej. "COL")
        private String countryName;    // Nombre del país
        private double currentValue;   // Valor actual del indicador
        private double growthRate;     // % de crecimiento
        private double priorityScore;  // Score 0..1 calculado
        private int latestYear;        // Último año disponible

        public PriorityRegion(String countryCode, String countryName, double currentValue,
                              double growthRate, double priorityScore, int latestYear) {
            this.countryCode = countryCode;
            this.countryName = countryName;
            this.currentValue = currentValue;
            this.growthRate = growthRate;
            this.priorityScore = priorityScore;
            this.latestYear = latestYear;
        }

        // ===== Getters y Setters =====
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
