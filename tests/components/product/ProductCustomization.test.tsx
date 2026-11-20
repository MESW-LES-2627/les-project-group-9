import {useState} from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {ProductCustomization} from '~/components/product/ProductCustomization';
import {
  initialCustomizationChoice,
  type CustomizationChoice,
  type ProductCustomization as Customization,
} from '~/lib/customization';

const gemColors = [
  {value: 'ruby', label: 'Ruby'},
  {value: 'sapphire', label: 'Sapphire'},
];

function Harness({
  customization,
  onChange = () => {},
}: {
  customization: Customization;
  onChange?: (value: CustomizationChoice) => void;
}) {
  const [value, setValue] = useState(() =>
    initialCustomizationChoice(customization),
  );

  return (
    <ProductCustomization
      customization={customization}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('ProductCustomization', () => {
  it('offers only the allowed gem colors, with the first selected', () => {
    render(<Harness customization={{gemColors, engravingMaxLength: null}} />);

    expect(screen.getByRole('region', {name: 'Customize'})).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', {name: 'Ruby'})).toBeChecked();
    expect(screen.queryByLabelText('Engraving')).not.toBeInTheDocument();
  });

  it('reports another allowed gem color when the shopper picks it', async () => {
    const onChange = vi.fn();
    render(
      <Harness
        customization={{gemColors, engravingMaxLength: null}}
        onChange={onChange}
      />,
    );

    await userEvent.click(screen.getByRole('radio', {name: 'Sapphire'}));

    expect(screen.getByRole('radio', {name: 'Sapphire'})).toBeChecked();
    expect(screen.getByRole('radio', {name: 'Ruby'})).not.toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith({
      gemColor: 'sapphire',
      engraving: '',
    });
  });

  it('limits the engraving to the max length and counts down', async () => {
    const onChange = vi.fn();
    render(
      <Harness
        customization={{gemColors: [], engravingMaxLength: 5}}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Engraving');
    expect(input).toHaveAttribute('maxLength', '5');
    expect(input).toHaveAccessibleDescription('5 characters left');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();

    await userEvent.type(input, 'Ana');
    expect(input).toHaveAccessibleDescription('2 characters left');

    await userEvent.type(input, 'belle');
    expect(input).toHaveValue('Anabe');
    expect(input).toHaveAccessibleDescription('0 characters left');
    expect(onChange).toHaveBeenLastCalledWith({gemColor: '', engraving: 'Anabe'});
  });

  it('uses the singular form for one character left', async () => {
    render(<Harness customization={{gemColors: [], engravingMaxLength: 2}} />);

    await userEvent.type(screen.getByLabelText('Engraving'), 'A');
    expect(screen.getByText('1 character left')).toBeInTheDocument();
  });
});
