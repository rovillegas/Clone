import { Component } from '@angular/core';
import { DataSource } from '@angular/cdk/collections';
import { animate, state, style, transition, trigger } from '@angular/animations';
import {MatDialog} from '@angular/material/dialog';
import {DiagramDialogComponent} from './diagram-dialog.component';
import { Router } from '@angular/router';
import { AppConfigService } from '@alfresco/adf-core';
import { Observable, of } from 'rxjs';
import { AlfrescoApiCompatibility as AlfrescoApi } from '@alfresco/js-api';



@Component({
  selector: 'app-process-admin',
  templateUrl: './process-admin.component.html',
  styleUrls: ['./process-admin.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})


export class ProcessAdminComponent {

  expandedElement: any;
  displayedColumns = ['id', 'name', 'startedBy', 'startedAt', 'diagram'];
  dataSource: ExampleDataSource = null;

  isExpansionDetailRow = (i: number, row: Object) => row.hasOwnProperty('detailRow');

  constructor(public dialog: MatDialog, public router: Router,
              private appConfigService: AppConfigService) {
    this.dataSource = new ExampleDataSource(this.appConfigService);
  }

  openDiagram(processId: string) {
    this.dialog.open(DiagramDialogComponent, {
      data: {
        id: processId
      }
    });
  }

  goCase(caseNodeId: string) {
    this.router.navigate(['/folder', {
      f: caseNodeId
    }]);
  }

  reload() {
    this.dataSource.disconnect();
    this.dataSource = new ExampleDataSource(this.appConfigService);
  }

}


/**
 * Data source to provide what data should be rendered in the table. The observable provided
 * in connect should emit exactly the data that should be rendered by the table. If the data is
 * altered, the observable should emit that new set of data on the stream. In our case here,
 * we return a stream that contains only one set of data that doesn't change.
 */
export class ExampleDataSource extends DataSource<any> {

  instances: any[];
  otherFields: string[] = ['casenumber', 'status', 'caseNodeId'];
  alfrescoJsApi: any = null;

  static getVariable(variableModel: any, variableName: string) {
    for (const k in variableModel) {
      if (variableModel[k].name === variableName) {
        return variableModel[k].value;
      }
    }
    return '';
  }

  constructor(private appConfigService: AppConfigService) {
    super();
    this.alfrescoJsApi = new AlfrescoApi({provider: 'BPM', hostBpm: this.appConfigService.get('bpmHost')});
  }

  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<any[]> {
    const rows = [];

    this.alfrescoJsApi.bpmClient.callApi('/api/enterprise/historic-process-instances/query', 'POST',
      {}, {}, {}, {}, {'finished': false}, ['application/json'], ['application/json']).then((model: any) => {
      this.instances = model.data;
      this.completeRestVariables();
    });

    this.instances.forEach(element => rows.push(element, { detailRow: true, element }));

    return of(rows);
  }

  completeRestVariables() {
    for (const instance of this.instances) {
      this.alfrescoJsApi.bpmClient.callApi('/api/enterprise/process-instances/' + instance.id + '/variables', 'GET',
        {}, {}, {}, {}, {}, ['application/json'], ['application/json']).then((model: any) => {
        for (const otherField of this.otherFields) {
          instance[otherField] = ExampleDataSource.getVariable(model, otherField);
        }
      });
    }
  }

  disconnect() { }


}
