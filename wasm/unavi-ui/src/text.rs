use std::{
    cell::{Cell, RefCell},
    rc::Rc,
};

use meshtext::{IndexedMeshText, MeshGenerator, OwnedFace, TextSection};

use crate::{
    bindings::{
        exports::unavi::ui::text::{Guest, GuestText, GuestTextBox, Text as TextExport},
        unavi::layout::container::Container,
        wired::scene::mesh::{Mesh, Primitive},
    },
    GuestImpl,
};

const FONT: &[u8] = include_bytes!("../Roboto-Regular.ttf");

impl Guest for GuestImpl {
    type Text = Text;
    type TextBox = TextBox;
}

#[derive(Clone)]
pub struct Text(Rc<TextData>);

struct TextData {
    font_size: Cell<f32>,
    generator: RefCell<MeshGenerator<OwnedFace>>,
    mesh: Mesh,
    primitive: Primitive,
    text: RefCell<String>,
    thickness: Cell<f32>,
}

impl Text {
    fn generate(&self) {
        let font_size = self.0.font_size.get();
        let text = self.0.text.borrow().clone();
        let thickness = self.0.thickness.get();

        let flat = thickness == 0.0;

        let transform = [
            font_size, 0.0, 0.0, 0.0, 0.0, font_size, 0.0, 0.0, 0.0, 0.0, thickness, 0.0, 0.0, 0.0,
            0.0, 1.0,
        ];

        let data: Result<IndexedMeshText, _> =
            self.0
                .generator
                .borrow_mut()
                .generate_section(&text, flat, Some(&transform));

        if let Ok(data) = data {
            self.0.primitive.set_indices(&data.indices);
            self.0.primitive.set_positions(&data.vertices);
        } else {
            self.0.primitive.set_positions(&[]);
            self.0.primitive.set_indices(&[]);
        }
    }
}

impl GuestText for Text {
    fn new(text: String) -> Self {
        let mesh = Mesh::new();
        let primitive = mesh.create_primitive();

        Self(Rc::new(TextData {
            font_size: Cell::new(0.25),
            generator: RefCell::new(MeshGenerator::new(FONT.to_owned())),
            mesh,
            primitive,
            text: RefCell::new(text),
            thickness: Cell::default(),
        }))
    }

    fn ref_(&self) -> TextExport {
        TextExport::new(self.clone())
    }

    fn set_font(&self, value: Option<Vec<u8>>) {
        self.0
            .generator
            .replace(MeshGenerator::new(value.unwrap_or(FONT.to_owned())));
        self.generate();
    }

    fn text(&self) -> String {
        self.0.text.borrow().clone()
    }
    fn set_text(&self, value: String) {
        self.0.text.replace(value);
        self.generate();
    }

    fn font_size(&self) -> f32 {
        self.0.font_size.get()
    }
    fn set_font_size(&self, value: f32) {
        self.0.font_size.set(value);
        self.generate();
    }

    fn thickness(&self) -> f32 {
        self.0.thickness.get()
    }
    fn set_thickness(&self, value: f32) {
        self.0.thickness.set(value);
        self.generate();
    }

    fn mesh(&self) -> Mesh {
        self.0.mesh.ref_()
    }
}

pub struct TextBox {
    root: Container,
    text: Text,
}

impl GuestTextBox for TextBox {
    fn new(root: Container) -> Self {
        let text = Text::new(String::default());
        root.inner().set_mesh(Some(&text.mesh()));

        Self { root, text }
    }

    fn root(&self) -> Container {
        self.root.ref_()
    }
    fn text(&self) -> TextExport {
        self.text.ref_()
    }
}