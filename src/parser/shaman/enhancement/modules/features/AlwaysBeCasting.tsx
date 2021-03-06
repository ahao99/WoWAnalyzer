import React from 'react';

import CoreAlwaysBeCasting from 'parser/shared/modules/AlwaysBeCasting';
import { When, ThresholdStyle } from 'parser/core/ParseResults';
import SPELLS from 'common/SPELLS';
import { formatPercentage } from 'common/format';
import { STATISTIC_ORDER } from 'interface/others/StatisticBox';
import SpellLink from 'common/SpellLink';
import { i18n } from '@lingui/core';
import { t } from '@lingui/macro';

class AlwaysBeCasting extends CoreAlwaysBeCasting {
  get suggestionThresholds() {
    return {
      actual: this.downtimePercentage,
      isGreaterThan: {
        minor: 0.125,
        average: 0.175,
        major: 0.225,
      },
      style: ThresholdStyle.PERCENTAGE,
    };
  }

  suggestions(when: When) {
    const boss = this.owner.boss;
    const deadTimePercentage = this.totalTimeWasted / this.owner.fightDuration;

    when(deadTimePercentage).isGreaterThan(0.2)
      .addSuggestion((suggest, actual, recommended) => suggest(<span>Your downtime can be improved. Try to Always Be Casting (ABC), try to reduce the delay between casting spells. Even if you have to move, try casting something instant with range like <SpellLink id={SPELLS.FLAME_SHOCK.id} />, <SpellLink id={SPELLS.FROST_SHOCK.id} />, or instant <SpellLink id={SPELLS.LIGHTNING_BOLT.id} />/<SpellLink id={SPELLS.CHAIN_LIGHTNING.id} /></span>)
          .icon('spell_mage_altertime')
          .actual(i18n._(t('shaman.enhancement.suggestions.alwaysBeCasting.downtime')`${formatPercentage(actual)}% downtime`))
          .recommended(`<${formatPercentage(recommended)}% is recommended`)
          .regular(recommended + 0.15).major(recommended + 0.2));

    if (!boss || !boss.fight.disableDowntimeSuggestion) {
      when(this.suggestionThresholds)
        .addSuggestion((suggest, actual, recommended) => suggest(<span>Your downtime can be improved. Try to Always Be Casting (ABC), try to reduce the delay between casting spells. Even if you have to move, try casting something instant with range like <SpellLink id={SPELLS.FLAME_SHOCK.id} />, <SpellLink id={SPELLS.FROST_SHOCK.id} />, or instant <SpellLink id={SPELLS.LIGHTNING_BOLT.id} />/<SpellLink id={SPELLS.CHAIN_LIGHTNING.id} /></span>)
            .icon('spell_mage_altertime')
            .actual(i18n._(t('shaman.enhancement.suggestions.alwaysBeCasting.downtime')`${formatPercentage(actual)}% downtime`))
            .recommended(`<${formatPercentage(recommended)}% is recommended`));
    }
  }

  position = STATISTIC_ORDER.CORE(1);
}

export default AlwaysBeCasting;
