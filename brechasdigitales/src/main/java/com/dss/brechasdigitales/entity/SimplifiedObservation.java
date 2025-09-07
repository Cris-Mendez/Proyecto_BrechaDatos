package com.dss.brechasdigitales.entity; // Paquete donde se define la entidad JPA

// ====== IMPORTS JPA/Jakarta ======
// Anotaciones y tipos para mapear la clase a una tabla SQL
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Marca esta clase como entidad JPA y la mapea a la tabla "simplified_observations"
@Entity
@Table(name = "simplified_observations")
public class SimplifiedObservation {

    // Clave primaria autoincremental (IDENTITY)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // Código ISO/propio del país; hasta 10 caracteres
    @Column(name = "country_code", length = 10)
    private String countryCode;
    
    // Nombre legible del país; hasta 100 caracteres
    @Column(name = "country_name", length = 100)
    private String countryName;
    
    // Nombre del indicador; hasta 255 caracteres
    @Column(name = "indicator_name", length = 255)
    private String indicatorName;
    
    // Año o periodo temporal de la observación
    @Column(name = "time_period")
    private Integer timePeriod;
    
    // Valor observado (numérico) del indicador
    @Column(name = "obs_value")
    private Double obsValue;
    
    // Unidad de medida (por ejemplo, "%", "personas", etc.); hasta 100 caracteres
    @Column(name = "unit_measure", length = 100)
    private String unitMeasure;
    
    // Etiqueta de sexo (por defecto "Total"); hasta 50 caracteres
    @Column(name = "sex_label", length = 50)
    private String sexLabel = "Total";
    
    // Etiqueta de edad (por defecto "All ages"); hasta 100 caracteres
    @Column(name = "age_label", length = 100)
    private String ageLabel = "All ages";
    
    // Etiqueta de urbanización (por defecto "Total"); hasta 100 caracteres
    @Column(name = "urbanisation_label", length = 100)
    private String urbanisationLabel = "Total";

    // ====== Constructores ======
    public SimplifiedObservation() {} // Constructor vacío requerido por JPA
    
    // Constructor de conveniencia para crear instancias con los campos más comunes
    public SimplifiedObservation(String countryCode, String countryName, String indicatorName, 
                               Integer timePeriod, Double obsValue, String unitMeasure) {
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.indicatorName = indicatorName;
        this.timePeriod = timePeriod;
        this.obsValue = obsValue;
        this.unitMeasure = unitMeasure;
    }
    
    // ====== Getters y Setters (acceso a campos privados) ======
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getCountryCode() { return countryCode; }
    public void setCountryCode(String countryCode) { this.countryCode = countryCode; }
    
    public String getCountryName() { return countryName; }
    public void setCountryName(String countryName) { this.countryName = countryName; }
    
    public String getIndicatorName() { return indicatorName; }
    public void setIndicatorName(String indicatorName) { this.indicatorName = indicatorName; }
    
    public Integer getTimePeriod() { return timePeriod; }
    public void setTimePeriod(Integer timePeriod) { this.timePeriod = timePeriod; }
    
    public Double getObsValue() { return obsValue; }
    public void setObsValue(Double obsValue) { this.obsValue = obsValue; }
    
    public String getUnitMeasure() { return unitMeasure; }
    public void setUnitMeasure(String unitMeasure) { this.unitMeasure = unitMeasure; }
    
    public String getSexLabel() { return sexLabel; }
    public void setSexLabel(String sexLabel) { this.sexLabel = sexLabel; }
    
    public String getAgeLabel() { return ageLabel; }
    public void setAgeLabel(String ageLabel) { this.ageLabel = ageLabel; }
    
    public String getUrbanisationLabel() { return urbanisationLabel; }
    public void setUrbanisationLabel(String urbanisationLabel) { this.urbanisationLabel = urbanisationLabel; }
    
}
