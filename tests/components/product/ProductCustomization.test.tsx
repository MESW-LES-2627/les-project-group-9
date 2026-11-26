import {useState} from 'react';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {ProductCustomization} from '~/components/product/ProductCustomization';
import {
  initialCustomizationChoice,
  validateEngraving,
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

  const engravingError =
    customization.engravingMaxLength === null
      ? null
      : validateEngraving(customization.engravingMaxLength, value.engraving);

  return (
    <ProductCustomization
      customization={customization}
      value={value}
      engravingError={engravingError}
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

  it('renders one engraving row with the editor already open', () => {
    render(
      <Harness
        customization={{gemColors: [], engravingMaxLength: 20}}
      />,
    );

    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.queryByText('Personalize')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Engraving')).toHaveAttribute(
      'placeholder',
      'Type your engraving',
    );
    expect(screen.getByText('0/20')).toBeInTheDocument();
    expect(screen.queryByText(/Reverse side/)).not.toBeInTheDocument();
  });

  it('adapts the copy and singular error for a one-character product', async () => {
    render(
      <Harness
        customization={{gemColors: [], engravingMaxLength: 1}}
      />,
    );

    const input = screen.getByLabelText('Engraving');
    expect(input).toHaveAttribute('placeholder', 'One character');
    expect(screen.getByText('0/1')).toBeInTheDocument();

    await userEvent.type(input, 'AB');

    expect(
      screen.getByText('Engraving can be up to 1 character.'),
    ).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows the shopper text in the preview without changing case', async () => {
    render(
      <Harness
        customization={{gemColors: [], engravingMaxLength: 20}}
      />,
    );

    const input = screen.getByLabelText('Engraving');
    await userEvent.type(input, 'Ana Maria');

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Ana Maria')).toBeInTheDocument();
    expect(screen.getByText('9/20')).toBeInTheDocument();
  });

  it('does not truncate over-limit text and explains the error', async () => {
    const onChange = vi.fn();
    render(
      <Harness
        customization={{gemColors: [], engravingMaxLength: 5}}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Engraving');
    expect(input).not.toHaveAttribute('maxLength');

    await userEvent.type(input, 'Anabel');

    expect(input).toHaveValue('Anabel');
    expect(screen.getByText('6/5')).toBeInTheDocument();
    expect(
      screen.getByText('Engraving can be up to 5 characters.'),
    ).toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith({
      gemColor: '',
      engraving: 'Anabel',
    });
  });

  it('explains disallowed characters', async () => {
    render(
      <Harness
        customization={{gemColors: [], engravingMaxLength: 20}}
      />,
    );

    await userEvent.type(screen.getByLabelText('Engraving'), '<');

    expect(
      screen.getByText(
        'Use letters, numbers, spaces and simple punctuation only.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Engraving')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('trims and normalizes spaces for the preview and counter', async () => {
    render(
      <Harness
        customization={{gemColors: [], engravingMaxLength: 20}}
      />,
    );

    const input = screen.getByLabelText('Engraving');
    await userEvent.type(input, '  Ana  Maria  ');

    expect(screen.getByText('Ana Maria')).toBeInTheDocument();
    expect(screen.getByText('9/20')).toBeInTheDocument();

    await userEvent.tab();
    expect(input).toHaveValue('Ana Maria');
  });
});
