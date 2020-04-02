import {
  FieldConfigOptionsRegistry,
  FieldConfigSource,
  GrafanaPlugin,
  PanelEditorProps,
  PanelMigrationHandler,
  PanelOptionEditorsRegistry,
  PanelPluginMeta,
  PanelProps,
  PanelTypeChangedHandler,
  FieldConfigProperty,
  ThresholdsMode,
} from '../types';
import { FieldConfigEditorBuilder, PanelOptionsEditorBuilder } from '../utils/OptionsUIBuilders';
import { ComponentClass, ComponentType } from 'react';
import set from 'lodash/set';
import { deprecationWarning } from '../utils';
import { standardFieldConfigEditorRegistry } from '../field';

export const allStandardFieldConfigProperties: FieldConfigProperty[] = [
  FieldConfigProperty.Min,
  FieldConfigProperty.Max,
  FieldConfigProperty.Title,
  FieldConfigProperty.Unit,
  FieldConfigProperty.Decimals,
  FieldConfigProperty.NoValue,
  FieldConfigProperty.Color,
  FieldConfigProperty.Thresholds,
  FieldConfigProperty.Mappings,
  FieldConfigProperty.Links,
];

export const standardFieldConfigDefaults: Partial<Record<FieldConfigProperty, any>> = {
  [FieldConfigProperty.Thresholds]: {
    mode: ThresholdsMode.Absolute,
    steps: [
      { value: -Infinity, color: 'green' },
      { value: 80, color: 'red' },
    ],
  },
  [FieldConfigProperty.Mappings]: [],
};

export const standardFieldConfigProperties = new Map(allStandardFieldConfigProperties.map(p => [p, undefined]));

export class PanelPlugin<TOptions = any, TFieldConfigOptions extends object = any> extends GrafanaPlugin<
  PanelPluginMeta
> {
  private _defaults?: TOptions;
  private _fieldConfigDefaults: FieldConfigSource<TFieldConfigOptions> = {
    defaults: {},
    overrides: [],
  };

  private _fieldConfigRegistry?: FieldConfigOptionsRegistry;
  private _initConfigRegistry = () => {
    return new FieldConfigOptionsRegistry();
  };

  private _optionEditors?: PanelOptionEditorsRegistry;
  private registerOptionEditors?: (builder: PanelOptionsEditorBuilder<TOptions>) => void;

  panel: ComponentType<PanelProps<TOptions>>;
  editor?: ComponentClass<PanelEditorProps<TOptions>>;
  onPanelMigration?: PanelMigrationHandler<TOptions>;
  onPanelTypeChanged?: PanelTypeChangedHandler<TOptions>;
  noPadding?: boolean;

  /**
   * Legacy angular ctrl.  If this exists it will be used instead of the panel
   */
  angularPanelCtrl?: any;

  constructor(panel: ComponentType<PanelProps<TOptions>>) {
    super();
    this.panel = panel;
  }

  get defaults() {
    let result = this._defaults || {};

    if (!this._defaults) {
      const editors = this.optionEditors;

      if (!editors || editors.list().length === 0) {
        return null;
      }

      for (const editor of editors.list()) {
        set(result, editor.id, editor.defaultValue);
      }
    }
    return result;
  }

  get fieldConfigDefaults(): FieldConfigSource<TFieldConfigOptions> {
    const configDefaults = this._fieldConfigDefaults.defaults;
    configDefaults.custom = {} as TFieldConfigOptions;

    for (const option of this.fieldConfigRegistry.list()) {
      set(configDefaults, option.id, option.defaultValue);
    }

    return {
      defaults: {
        ...configDefaults,
      },
      overrides: this._fieldConfigDefaults.overrides,
    };

    /*   return {
      defaults: {
        ...(this._standardFieldConfigProperties ? Object.fromEntries(this._standardFieldConfigProperties) : {}),
        custom:
          Object.keys(customPropertiesDefaults).length > 0
            ? {
                ...customPropertiesDefaults,
              }
            : undefined,
        ...this._fieldConfigDefaults.defaults,
      },
      // TODO: not sure yet what about overrides, if anything
      overrides: this._fieldConfigDefaults.overrides,
    }; */
  }

  /**
   * @deprecated setDefaults is deprecated in favor of setPanelOptions
   */
  setDefaults(defaults: TOptions) {
    deprecationWarning('PanelPlugin', 'setDefaults', 'setPanelOptions');
    this._defaults = defaults;
    return this;
  }

  get fieldConfigRegistry() {
    if (!this._fieldConfigRegistry) {
      this._fieldConfigRegistry = this._initConfigRegistry();
    }

    return this._fieldConfigRegistry;
  }

  get optionEditors() {
    if (!this._optionEditors && this.registerOptionEditors) {
      const builder = new PanelOptionsEditorBuilder<TOptions>();
      this.registerOptionEditors(builder);
      this._optionEditors = builder.getRegistry();
    }

    return this._optionEditors;
  }

  setEditor(editor: ComponentClass<PanelEditorProps<TOptions>>) {
    this.editor = editor;
    return this;
  }

  setNoPadding() {
    this.noPadding = true;
    return this;
  }

  /**
   * This function is called before the panel first loads if
   * the current version is different than the version that was saved.
   *
   * This is a good place to support any changes to the options model
   */
  setMigrationHandler(handler: PanelMigrationHandler) {
    this.onPanelMigration = handler;
    return this;
  }

  /**
   * This function is called when the visualization was changed. This
   * passes in the panel model for previous visualisation options inspection
   * and panel model updates.
   *
   * This is useful for supporting PanelModel API updates when changing
   * between Angular and React panels.
   */
  setPanelChangeHandler(handler: PanelTypeChangedHandler) {
    this.onPanelTypeChanged = handler;
    return this;
  }

  setFieldConfigOptions(addCustomOptions?: (builder: FieldConfigEditorBuilder<TFieldConfigOptions>) => void) {
    // builder is applied lazily when custom field configs are accessed
    this._initConfigRegistry = () => {
      const registry = new FieldConfigOptionsRegistry();

      // Add custom options
      if (addCustomOptions) {
        const builder = new FieldConfigEditorBuilder<TFieldConfigOptions>();
        addCustomOptions(builder);

        for (const customProp of builder.getRegistry().list()) {
          customProp.isCustom = true;
          // need to do something to make the custom items not conflict with standard ones
          // problem is id (registry index) is used as property path
          // so sort of need a property path on the FieldPropertyEditorItem
          customProp.id = 'custom.' + customProp.id;
          registry.register(customProp);
        }
      }

      // add standard props
      for (const fieldConfigProp of standardFieldConfigEditorRegistry.list()) {
        registry.register(fieldConfigProp);
      }

      return registry;
    };

    return this;
  }

  /**
   * Enables panel options editor creation
   *
   * @example
   * ```typescript
   *
   * import { ShapePanel } from './ShapePanel';
   *
   * interface ShapePanelOptions {}
   *
   * export const plugin = new PanelPlugin<ShapePanelOptions>(ShapePanel)
   *   .setPanelOptions(builder => {
   *     builder
   *       .addSelect({
   *         id: 'shape',
   *         name: 'Shape',
   *         description: 'Select shape to render'
   *         settings: {
   *           options: [
   *             {value: 'circle', label: 'Circle' },
   *             {value: 'square', label: 'Square },
   *             {value: 'triangle', label: 'Triangle }
   *            ]
   *         },
   *       })
   *   })
   * ```
   *
   * @public
   **/
  setPanelOptions(builder: (builder: PanelOptionsEditorBuilder<TOptions>) => void) {
    // builder is applied lazily when options UI is created
    this.registerOptionEditors = builder;
    return this;
  }
}
