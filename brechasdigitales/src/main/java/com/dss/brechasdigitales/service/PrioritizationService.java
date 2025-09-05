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
            
            // Calcular métricas de priorización
            SimplifiedObservation latestObs = countryData.stream()
                .max(Comparator.comparingInt(SimplifiedObservation::getTimePeriod))
                .orElse(null);
                
            if (latestObs == null) continue;
            
            double latestValue = latestObs.getObsValue();
            double growthRate = calculateGrowthRate(countryData);
            double gapToTarget = calculateGapToTarget(latestValue);
            double populationFactor = getPopulationFactor(countryCode);
            
            // Puntaje compuesto de priorización
            double priorityScore = (growthRate * 0.3) + (gapToTarget * 0.4) + (populationFactor * 0.3);
            
            priorities.add(new PriorityRegion(
                countryCode,
                latestObs.getCountryName(),
                latestValue,
                growthRate,
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
        
        return ((newestValue - oldestValue) / oldestValue) * 100;
    }
    
    private double calculateGapToTarget(double currentValue) {
        // Target de 100 suscripciones por 100 habitantes
        double target = 100;
        return Math.max(0, target - currentValue) / target;
    }
    
    private double getPopulationFactor(String countryCode) {
        // Datos de población aproximados (deberían venir de una base de datos)
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
        private double growthRate;
        private double priorityScore;
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