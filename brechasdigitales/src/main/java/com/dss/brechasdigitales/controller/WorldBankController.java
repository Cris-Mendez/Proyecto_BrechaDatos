package com.dss.brechasdigitales.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/proxy/worldbank")
@CrossOrigin(origins = "http://localhost:4200") // permite Angular
public class WorldBankController {

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String WORLD_BANK_API_BASE_URL = "https://data360api.worldbank.org";

    @GetMapping("/test")
    public ResponseEntity<String> testConnection() {
        return ResponseEntity.ok("Conexión con el backend establecida (Data360 API).");
    }

    // Endpoint para hacer búsquedas en Data360
    @PostMapping("/search")
    public ResponseEntity<String> search(@RequestBody String body) {
        String url = WORLD_BANK_API_BASE_URL + "/data360/searchv2";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(body, headers);

            System.out.println("Llamando a URL: " + url);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            System.out.println("Respuesta de searchv2: " + response.getBody());

            return ResponseEntity.ok(response.getBody());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body("Error al consultar searchv2: " + e.getMessage());
        }
    }

    // Endpoint de ejemplo: Población total de Colombia (2000–2020)
    @GetMapping("/population/colombia")
    public ResponseEntity<String> getColombiaPopulation() {
        String url = WORLD_BANK_API_BASE_URL +
                "/data360/data?DATABASE_ID=WB_WDI&INDICATOR=WB_WDI_SP_POP_TOTL&REF_AREA=COL&timePeriodFrom=2000&timePeriodTo=2024";
        try {
            System.out.println("Llamando a URL: " + url);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            String responseBody = response.getBody();
            if (responseBody == null) {
                return ResponseEntity.status(500)
                        .body("Error al obtener datos de población de Colombia: la respuesta está vacía.");
            }

            // 🔹 Reemplazar todos los "_T" en la respuesta JSON por "Valor total"
            responseBody = responseBody.replace("\"_T\"", "\"Valor total\"");

            System.out.println("Respuesta población Colombia (transformada): " + responseBody);

            return ResponseEntity.ok(responseBody);
        } catch (Exception e) {

            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body("Error al obtener datos de población de Colombia: " + e.getMessage());
        }
    }

}
