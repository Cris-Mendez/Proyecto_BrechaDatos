package com.dss.brechasdigitales.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.dss.brechasdigitales.entity.SimplifiedObservation;

@Repository
public interface SimplifiedObservationRepository extends JpaRepository<SimplifiedObservation, Long> {

    // Encontrar por país e indicador (para gráficas de evolución temporal)
    List<SimplifiedObservation> findByCountryCodeAndIndicatorNameOrderByTimePeriod(String countryCode,
            String indicatorName);

    // Encontrar por año e indicador (para comparación entre países)
    List<SimplifiedObservation> findByTimePeriodAndIndicatorNameOrderByObsValueDesc(Integer timePeriod,
            String indicatorName);

    // Encontrar todos los indicadores disponibles
    @Query("SELECT DISTINCT o.indicatorName FROM SimplifiedObservation o ORDER BY o.indicatorName")
    List<String> findDistinctIndicatorNames();

    // Encontrar todos los países disponibles
    @Query("SELECT DISTINCT o.countryCode, o.countryName FROM SimplifiedObservation o ORDER BY o.countryName")
    List<Object[]> findDistinctCountries();

    // Encontrar años disponibles para un indicador
    @Query("SELECT DISTINCT o.timePeriod FROM SimplifiedObservation o WHERE o.indicatorName = :indicatorName ORDER BY o.timePeriod")
    List<Integer> findAvailableYears(@Param("indicatorName") String indicatorName);

    // Último año disponible para cada indicador
    @Query("SELECT o.indicatorName, MAX(o.timePeriod) FROM SimplifiedObservation o GROUP BY o.indicatorName")
    List<Object[]> findLatestYearsPerIndicator();

    List<SimplifiedObservation> findByCountryCode(String countryCode);

    List<SimplifiedObservation> findByIndicatorName(String indicatorName);

    List<SimplifiedObservation> findByTimePeriod(Integer timePeriod);

    // Nuevo método para priorización básica
    List<SimplifiedObservation> findByIndicatorNameAndTimePeriodBetween(
            String indicatorName, int startYear, int endYear);

    // 🔹 Nuevo: con filtro por grupos de edad
    List<SimplifiedObservation> findByIndicatorNameAndAgeLabelInAndTimePeriodBetween(
            String indicatorName, List<String> ageGroups, int startYear, int endYear);

    // Nuevo con filtro por edad 👇
    List<SimplifiedObservation> findByIndicatorNameAndTimePeriodBetweenAndAgeLabel(
            String indicatorName,
            int minYear,
            int maxYear,
            String ageLabel);

    // 🔹 Métodos para listas de valores únicos
    @Query("SELECT DISTINCT o.ageLabel FROM SimplifiedObservation o ORDER BY o.ageLabel")
    List<String> findDistinctAgeLabels();

    @Query("SELECT DISTINCT o.sexLabel FROM SimplifiedObservation o ORDER BY o.sexLabel")
    List<String> findDistinctSexLabels();

    @Query("SELECT DISTINCT o.urbanisationLabel FROM SimplifiedObservation o ORDER BY o.urbanisationLabel")
    List<String> findDistinctUrbanisationLabels();

    // Consulta flexible con filtros opcionales
    @Query("SELECT o FROM SimplifiedObservation o WHERE " +
            "(:countryCode IS NULL OR o.countryCode = :countryCode) AND " +
            "(:indicatorName IS NULL OR o.indicatorName = :indicatorName) AND " +
            "(:startYear IS NULL OR o.timePeriod >= :startYear) AND " +
            "(:endYear IS NULL OR o.timePeriod <= :endYear)")
    List<SimplifiedObservation> findWithFilters(
            @Param("countryCode") String countryCode,
            @Param("indicatorName") String indicatorName,
            @Param("startYear") Integer startYear,
            @Param("endYear") Integer endYear);
}
