import {
  Component,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import * as echarts from 'echarts';
import { Observation, ObservationService } from '../../services/observation';

import { interval, switchMap } from 'rxjs';
type TooltipSize = { contentSize: number[]; viewSize: number[] };
type TooltipRect = { x: number; y: number; width: number; height: number } | null;

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [],
  templateUrl: './mapa.html',
  styleUrls: ['./mapa.css'],
})
export class MapaComponent implements OnInit, AfterViewInit {
  @ViewChild('chart', { static: true }) chartElement!: ElementRef;
  private chart!: echarts.ECharts;
  private chartData: any[] = [];

  constructor(
    private http: HttpClient,
    private observationService: ObservationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {}

 ngAfterViewInit(): void {
  if (isPlatformBrowser(this.platformId)) {
    setTimeout(() => this.inicializarMapa(), 0);
    window.addEventListener('resize', () => this.chart?.resize());

    // Reconsultar datos cada 30 segundos
    interval(30000).pipe(
      switchMap(() => this.observationService.getAll())
    ).subscribe(observations => {
      this.actualizarDatos(observations);
    });
  }
}

  /** Posiciona el tooltip sin salirse del viewport */
  private tooltipPosition(
    point: number[],                     // [mouseX, mouseY]
    _params: unknown,                    // no lo usamos
    _dom: HTMLElement,                   // no lo usamos directamente
    _rect: TooltipRect,                  // no lo usamos
    size: TooltipSize
  ): number[] {
    const [mouseX, mouseY] = point;
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    const boxWidth = size.contentSize[0];
    const boxHeight = size.contentSize[1];

    let x = mouseX + 15;
    let y = mouseY + 15;

    if (x + boxWidth > viewWidth - 10) x = mouseX - boxWidth - 15;
    if (y + boxHeight > viewHeight - 10) y = mouseY - boxHeight - 15;

    x = Math.max(10, x);
    y = Math.max(10, y);

    return [x, y];
  }

  private inicializarMapa() {
    this.chart = echarts.init(this.chartElement.nativeElement);

    this.chart.showLoading('default', {
      text: 'Cargando mapa...',
      color: '#005f73',
    });

    this.http.get('assets/world.json').subscribe((worldMap: any) => {
      echarts.registerMap('world', worldMap);

      // Base
      this.chart.setOption({
        tooltip: {
          trigger: 'item',
          confine: true,
          appendToBody: true,
          position: (point: number[], params: unknown, dom: HTMLElement, rect: TooltipRect, size: TooltipSize) =>
            this.tooltipPosition(point, params, dom, rect, size),
        },
        geo: {
          map: 'world',
          roam: true,
          zoom: 1.2,
          scaleLimit: { min: 1, max: 10 },
          emphasis: { label: { show: false } },
        },
        series: [
          {
            name: 'Mapa',
            type: 'map',
            geoIndex: 0,
            roam: true,
            data: [],
          },
        ],
      });

      // Datos
      this.observationService.getAll().subscribe((observations: Observation[]) => {
        const grouped: { [key: string]: Observation } = {};
        observations.forEach((obs) => {
          if (!grouped[obs.countryName] || obs.timePeriod > grouped[obs.countryName].timePeriod) {
            grouped[obs.countryName] = obs;
          }
        });

        this.chartData = Object.values(grouped).map((obs) => ({
          name: obs.countryName,
          value: obs.obsValue,
          indicatorName: obs.indicatorName,
          timePeriod: obs.timePeriod,
          unitMeasure: obs.unitMeasure,
          sexLabel: obs.sexLabel,
          ageLabel: obs.ageLabel,
          urbanisationLabel: obs.urbanisationLabel,
        }));

        this.chart.setOption({
          tooltip: {
            trigger: 'item',
            confine: true,
            appendToBody: true,
            position: (point: number[], params: unknown, dom: HTMLElement, rect: TooltipRect, size: TooltipSize) =>
              this.tooltipPosition(point, params, dom, rect, size),
            formatter: (params: any) => {
              if (!params.data) return `${params.name}<br/>Sin datos`;
              const d = params.data;
              return `
                <strong>${params.name}</strong><br/>
                Valor: ${d.value ?? 'Sin datos'} ${d.unitMeasure ?? ''}<br/>
                Indicador: ${d.indicatorName ?? ''}<br/>
                Año: ${d.timePeriod ?? ''}<br/>
              `;
            },
          },
          visualMap: {
            min: 0,
            max: 200,
            text: ['Alto', 'Bajo'],
            left: 'left',
            bottom: '10px',
            inRange: { color: ['#d4f1f9', '#1a0479ff']},
            calculable: true,
          },
          series: [
            {
              name: 'Mapa',
              type: 'map',
              geoIndex: 0,
              roam: true,
              data: this.chartData,
            },
          ],
        });

        this.chart.hideLoading();
        this.chart.resize();
      });
    });
  }

  // 🔍 Buscar y resaltar país
  buscarPais(event: any) {
    const nombre = (event?.target?.value ?? '').trim();
    if (!nombre) return;

    const pais = this.chartData.find((d) => d.name.toLowerCase() === nombre.toLowerCase());
    if (pais) {
      this.chart.dispatchAction({ type: 'highlight', name: pais.name });
      this.chart.dispatchAction({ type: 'showTip', name: pais.name });
    } else {
      alert('País no encontrado');
    }
  }

  private actualizarDatos(observations: Observation[]) {
  const grouped: { [key: string]: Observation } = {};
  observations.forEach((obs) => {
    if (!grouped[obs.countryName] || obs.timePeriod > grouped[obs.countryName].timePeriod) {
      grouped[obs.countryName] = obs;
    }
  });

  this.chartData = Object.values(grouped).map((obs) => ({
    name: obs.countryName,
    value: obs.obsValue,
    indicatorName: obs.indicatorName,
    timePeriod: obs.timePeriod,
    unitMeasure: obs.unitMeasure,
    sexLabel: obs.sexLabel,
    ageLabel: obs.ageLabel,
    urbanisationLabel: obs.urbanisationLabel,
  }));

  this.chart.setOption({
    series: [{ data: this.chartData }],
  });
}
}
